"""
Uncertainty and break-even.

Document 2 commits the study to reporting ranges rather than points: "in the
model each one becomes a range, not a fixed number". This module is where that
promise is kept.

Why Latin Hypercube rather than plain random draws
--------------------------------------------------
LHS stratifies each parameter's range and shuffles the strata, so the sample
covers the space evenly instead of clumping. For the same number of draws the
percentiles are markedly more stable, which matters because this runs live for
other people and a result that jitters between refreshes looks broken. Seeded,
so any run is reproducible.
"""

from __future__ import annotations

import numpy as np
from scipy.optimize import brentq
from scipy.stats import qmc

from .netback import best_alternative_to_compute, netback_all, netback_compute
from .provenance import ParameterSet


def sample(ps: ParameterSet, n: int = 8_192, seed: int = 20260914) -> dict[str, np.ndarray]:
    """Draw `n` parameter vectors by Latin Hypercube.

    Uncertain parameters are sampled uniformly across [low, high]. Fixed
    parameters are broadcast unchanged, so downstream code can treat every
    parameter as an array without special-casing.

    Uniform is the honest default: a triangular or PERT distribution would
    imply knowledge about the shape of the uncertainty that this study does not
    yet have. Revisit once the values are sourced.
    """
    uncertain = ps.uncertain()
    sampler = qmc.LatinHypercube(d=len(uncertain), seed=seed)
    unit = sampler.random(n)

    lows = np.array([p.low for p in uncertain])
    highs = np.array([p.high for p in uncertain])
    scaled = qmc.scale(unit, lows, highs)

    out: dict[str, np.ndarray] = {}
    for i, p in enumerate(uncertain):
        out[p.name] = scaled[:, i]
    for p in ps.parameters.values():
        if p.name not in out:
            out[p.name] = np.full(n, p.value)
    return out


def percentiles(values: np.ndarray) -> dict[str, float]:
    """P10, P50, P90 and the mean.

    P50 is reported as the central figure rather than the mean because the
    netback distributions are skewed: a handful of draws combining a cheap
    accelerator with a high compute price pull the mean well above the median,
    and quoting the mean would flatter the compute pathway.
    """
    v = np.asarray(values, dtype=float)
    return {
        "p10": float(np.percentile(v, 10)),
        "p50": float(np.percentile(v, 50)),
        "p90": float(np.percentile(v, 90)),
        "mean": float(np.mean(v)),
        "min": float(np.min(v)),
        "max": float(np.max(v)),
    }


def run_uncertainty(ps: ParameterSet, n: int = 8_192, seed: int = 20260914) -> dict:
    """Full stochastic run: every pathway, plus how often compute ranks first."""
    draws = sample(ps, n=n, seed=seed)
    nb = netback_all(draws)

    stacked = np.vstack([nb["compute"], nb["grid"], nb["fertiliser"], nb["lng"]])
    winner = np.argmax(stacked, axis=0)
    names = ["compute", "grid", "fertiliser", "lng"]

    return {
        "n": n,
        "seed": seed,
        "set_id": ps.set_id,
        "pathways": {k: percentiles(v) for k, v in nb.items()},
        "samples": {k: v for k, v in nb.items()},  # kept for plotting
        "rank_first_share": {
            names[i]: float(np.mean(winner == i)) for i in range(4)
        },
        "compute_beats_best_alternative": float(
            np.mean(nb["compute"] > best_alternative_to_compute(draws))
        ),
    }


# ---------------------------------------------------------------------------
# Break-even
# ---------------------------------------------------------------------------

def breakeven_gpu_price(
    p: dict,
    lo: float = 0.01,
    hi: float = 200.0,
) -> float:
    """The accelerator-hour price at which compute stops out-earning its best
    alternative use of the same gas.

    Solved by Brent's method rather than by scanning a grid: it is exact to
    machine precision, needs no resolution choice, and converges in a few
    iterations, which matters when it runs inside every Monte Carlo draw.

    The function being solved is strictly increasing in price, so the root is
    unique and bracketing is safe.
    """
    def scalar(x) -> float:
        """Collapse to a plain float. `best_alternative_to_compute` stacks the
        pathways and reduces along axis 0, so even a single scenario comes back
        as a one-element array rather than a 0-d one."""
        return float(np.asarray(x, dtype=float).reshape(-1)[0])

    single = {k: scalar(v) for k, v in p.items()}
    target = scalar(best_alternative_to_compute(single))

    def gap(price: float) -> float:
        trial = dict(single, gpu_hour_price=price)
        return scalar(netback_compute(trial)) - target

    if gap(lo) > 0:
        return lo  # compute already wins at any price; report the floor
    if gap(hi) < 0:
        return float("nan")  # never competitive within a sane price range
    return float(brentq(gap, lo, hi, xtol=1e-10))


def breakeven_distribution(
    ps: ParameterSet,
    n: int = 2_048,
    seed: int = 20260914,
) -> dict:
    """Break-even solved inside the uncertainty, giving a range not a point.

    Fewer draws than the netback run because each one is a root-find. 2,048 is
    ample for stable deciles and keeps the interface responsive.

    "The break-even lies between X and Y with 80 per cent confidence under the
    stated assumptions" is a defensible result. A single figure is not.
    """
    draws = sample(ps, n=n, seed=seed)
    names = list(draws.keys())
    out = np.empty(n)
    for i in range(n):
        row = {k: draws[k][i] for k in names}
        out[i] = breakeven_gpu_price(row)

    valid = out[np.isfinite(out)]
    stats = percentiles(valid)
    stats["n_valid"] = int(valid.size)
    stats["n_total"] = int(n)
    stats["samples"] = valid
    return stats
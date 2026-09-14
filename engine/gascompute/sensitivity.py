"""
Global sensitivity analysis.

Why Sobol and not a tornado chart
---------------------------------
A tornado moves one parameter at a time and holds the rest at their base value.
That is only valid when parameters act independently, and here they plainly do
not: the discount rate and the accelerator life multiply each other inside the
capital recovery factor, so their joint effect is nothing like the sum of their
separate effects. A one-at-a-time chart would understate both.

Sobol decomposes the variance of the output across the whole input space.

    S1    first order  the share of variance this parameter explains alone
    ST    total order  its share including every interaction it takes part in

ST minus S1 is the interaction term. Where that gap is wide, the parameter only
matters in combination with something else, and reporting it as an independent
driver would be wrong.

What this buys the study
------------------------
A sentence that is itself a finding: these parameters account for this share of
the variance, and the rest do not matter. It tells a user of the tool which of
their own numbers they need to get right, and it tells the reader which of the
unsourced placeholders actually threaten the conclusion. Some will not.
"""

from __future__ import annotations

import numpy as np
from SALib.analyze import sobol as sobol_analyze
from SALib.sample import sobol as sobol_sample

from .netback import netback_all
from .provenance import ParameterSet
from .uncertainty import breakeven_gpu_price


def _problem(ps: ParameterSet) -> tuple[dict, list]:
    uncertain = ps.uncertain()
    return (
        {
            "num_vars": len(uncertain),
            "names": [p.name for p in uncertain],
            "bounds": [[p.low, p.high] for p in uncertain],
        },
        uncertain,
    )


def _as_param_dict(ps: ParameterSet, matrix: np.ndarray, names: list[str]) -> dict:
    d = {n: matrix[:, i] for i, n in enumerate(names)}
    for p in ps.parameters.values():
        if p.name not in d:
            d[p.name] = np.full(matrix.shape[0], p.value)
    return d


def sensitivity_netback(
    ps: ParameterSet,
    pathway: str = "compute",
    n: int = 1_024,
    seed: int = 20260914,
) -> list[dict]:
    """Sobol indices for one pathway's netback.

    `n` is the base sample size. SALib evaluates n * (2d + 2) points, so with
    around twenty uncertain parameters this is roughly 43,000 model runs. The
    model is vectorised numpy, so it still returns in well under a second.
    """
    problem, uncertain = _problem(ps)
    X = sobol_sample.sample(problem, n, seed=seed, calc_second_order=False)
    draws = _as_param_dict(ps, X, problem["names"])
    Y = np.asarray(netback_all(draws)[pathway], dtype=float)

    Si = sobol_analyze.analyze(problem, Y, calc_second_order=False, print_to_console=False)
    return _rank(problem["names"], Si, ps)


def sensitivity_breakeven(
    ps: ParameterSet,
    n: int = 256,
    seed: int = 20260914,
) -> list[dict]:
    """Sobol indices for the break-even price.

    Deliberately smaller: the break-even is a root-find per sample and cannot be
    vectorised, so this is the expensive one. Run it offline for the thesis, not
    on every click in the interface. Cache the result.
    """
    problem, uncertain = _problem(ps)
    X = sobol_sample.sample(problem, n, seed=seed, calc_second_order=False)
    names = problem["names"]

    Y = np.empty(X.shape[0])
    for i in range(X.shape[0]):
        row = {nm: X[i, j] for j, nm in enumerate(names)}
        for p in ps.parameters.values():
            row.setdefault(p.name, p.value)
        Y[i] = breakeven_gpu_price(row)

    finite = np.isfinite(Y)
    if not finite.all():
        # Brent returns nan where compute never competes. Substituting the
        # worst finite value keeps the variance decomposition defined and is
        # conservative, since it treats "never competitive" as the extreme of
        # the same scale rather than discarding the draw.
        Y = np.where(finite, Y, np.nanmax(Y[finite]))

    Si = sobol_analyze.analyze(problem, Y, calc_second_order=False, print_to_console=False)
    return _rank(names, Si, ps)


def _rank(names: list[str], Si, ps: ParameterSet) -> list[dict]:
    rows = []
    for i, name in enumerate(names):
        s1 = float(Si["S1"][i])
        st = float(Si["ST"][i])
        rows.append({
            "name": name,
            "label": ps[name].label,
            "unit": ps[name].unit,
            "provenance": ps[name].provenance.value,
            # Sobol indices are unbiased estimates and can come out slightly
            # negative for parameters with no real influence. Clipping at zero
            # is standard practice and keeps the chart readable.
            "first_order": max(s1, 0.0),
            "total_order": max(st, 0.0),
            "interaction": max(st - s1, 0.0),
        })
    rows.sort(key=lambda r: r["total_order"], reverse=True)
    return rows


def drivers_sentence(rows: list[dict], threshold: float = 0.90) -> str:
    """The finding, written out. Lists the smallest set of parameters whose
    total-order indices together reach `threshold` of the explained variance."""
    total = sum(r["total_order"] for r in rows) or 1.0
    running, chosen = 0.0, []
    for r in rows:
        chosen.append(r)
        running += r["total_order"] / total
        if running >= threshold:
            break
    labels = ", ".join(r["label"].lower() for r in chosen)
    return (
        f"{len(chosen)} of {len(rows)} parameters account for "
        f"{running * 100:.0f} per cent of the variance: {labels}."
    )
"""
DJN API.

One service, four endpoints, deliberately small. Every response carries the
parameter set id and the random seed so any figure on screen can be reproduced
and cited.

Run locally
-----------
    cd api
    uvicorn index:app --reload --port 8000

Deploy
------
Vercel picks this up as a Python function. Sobol is NOT exposed here: it costs
tens of thousands of model evaluations and belongs in an offline run whose
output is cached as static JSON. Everything below returns in milliseconds.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# the engine lives one level up, as its own importable package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "engine"))

from gascompute.lcoe import (  # noqa: E402
    SOLAR_BATTERY_BENCHMARK_USD_PER_MWH,
    lcoe_busbar,
    lcoe_by_site,
)
from gascompute.netback import (  # noqa: E402
    PATHWAY_LABELS,
    compute_cost_per_accelerator_hour,
    netback_all,
)
from gascompute.compute_unit import chain_breakdown  # noqa: E402
from gascompute.parameters import base_case  # noqa: E402
from gascompute.uncertainty import (  # noqa: E402
    breakeven_distribution,
    breakeven_gpu_price,
    run_uncertainty,
)

app = FastAPI(title="DanJohn-Nwobi Gas Allocation Model", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten to the deployed origin before release
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScenarioRequest(BaseModel):
    """Overrides only. Anything omitted falls back to the base-case snapshot,
    so the front end never has to send the full parameter set."""

    overrides: dict[str, float] = Field(default_factory=dict)
    draws: int = Field(default=4096, ge=256, le=20000)
    seed: int = 20260914
    include_samples: bool = False


def _resolved(overrides: dict[str, float]) -> tuple[dict, object]:
    ps = base_case()
    p = ps.values()
    for k, v in overrides.items():
        if k in p:
            p[k] = float(v)
    return p, ps


def _f(x) -> float:
    return float(np.asarray(x, dtype=float).reshape(-1)[0])


@app.get("/api/parameters")
def parameters() -> dict:
    """Everything the interface needs to render its controls, including the
    provenance tag and range for each field. The UI has no hard-coded numbers:
    it is driven entirely by this payload, so the engine stays the one source
    of truth."""
    ps = base_case()
    return {
        "set_id": ps.set_id,
        "description": ps.description,
        "parameters": [p.to_dict() for p in ps.parameters.values()],
        "unsourced_count": len(ps.unsourced()),
        "sourced_count": sum(
            1 for p in ps.parameters.values() if p.provenance.value == "sourced"
        ),
    }


@app.post("/api/scenario")
def scenario(req: ScenarioRequest) -> dict:
    """The main call. Deterministic base case, the uncertainty spread, the
    break-even distribution and the cost stack, in one round trip."""
    p, ps = _resolved(req.overrides)

    nb = {k: _f(v) for k, v in netback_all(p).items()}
    ranked = sorted(nb.items(), key=lambda kv: -kv[1])

    cost = compute_cost_per_accelerator_hour(
        p["accelerator_capex"], p["accelerator_life"],
        p["facility_capex_per_kw"], p["facility_life"],
        p["accelerator_kw"], p["pue"], p["compute_opex"],
        p["discount_rate"], p["availability"],
    )
    cash_cost = _f(cost["total"])
    be = breakeven_gpu_price(p)

    # Apply the same overrides to the stochastic run.
    #
    # An overridden parameter is PINNED, not re-centred: if the user states a
    # figure, the model should treat it as known and show the spread arising
    # from everything else. Leaving it free would mean dragging a slider moved
    # the point estimate while the distribution sat still, which reads as the
    # tool ignoring the input.
    ps_run = base_case()
    for k, v in req.overrides.items():
        if k in ps_run.parameters:
            target = ps_run[k]
            object.__setattr__(target, "value", float(v))
            object.__setattr__(target, "low", None)
            object.__setattr__(target, "high", None)

    unc = run_uncertainty(ps_run, n=req.draws, seed=req.seed)
    bd = breakeven_distribution(ps_run, n=min(req.draws // 2, 2048), seed=req.seed)

    payload = {
        "set_id": ps.set_id,
        "seed": req.seed,
        "draws": req.draws,
        "chain": chain_breakdown(
            p["heat_rate"], p["pue"], p["accelerator_kw"], p["utilisation"]
        ),
        "netback": [
            {
                "key": k,
                "label": PATHWAY_LABELS[k],
                "value": v,
                "p10": unc["pathways"][k]["p10"],
                "p50": unc["pathways"][k]["p50"],
                "p90": unc["pathways"][k]["p90"],
            }
            for k, v in ranked
        ],
        "winner": ranked[0][0],
        "gas_price_power": p["gas_price_power"],
        "cost_stack": {
            "accelerator_capital": _f(cost["accelerator_capital"]),
            "facility_capital": _f(cost["facility_capital"]),
            "operating": _f(cost["operating"]),
            "total": cash_cost,
        },
        "breakeven": {
            "point": be,
            "cash_cost": cash_cost,
            # The headline of the study: what the gas itself is worth per
            # accelerator-hour, once the cost of the machine is met.
            "gas_opportunity_cost": be - cash_cost,
            "p10": bd["p10"],
            "p50": bd["p50"],
            "p90": bd["p90"],
        },
        "compute_ranks_first_share": unc["rank_first_share"]["compute"],
        "lcoe": {
            "busbar_usd_per_mwh": _f(lcoe_busbar(p)["total"]) * 1000.0,
            "solar_battery_benchmark_usd_per_mwh": SOLAR_BATTERY_BENCHMARK_USD_PER_MWH,
            "sites": lcoe_by_site(p),
        },
    }

    if req.include_samples:
        # thinned, because the histogram does not need 4,096 points and the
        # payload should stay small on a Nigerian mobile connection
        payload["samples"] = {
            "compute_netback": [
                float(x) for x in unc["samples"]["compute"][:600]
            ],
            "breakeven": [float(x) for x in bd["samples"][:600]],
        }

    return payload


@app.get("/api/audit")
def audit() -> dict:
    """Every value the study has not yet sourced, returned openly.

    The interface renders this rather than waiting to be asked. An expert who
    can see what the model does not know will argue with it, which is the
    point; an expert who discovers a hidden placeholder stops trusting it.
    """
    ps = base_case()
    return {
        "set_id": ps.set_id,
        "unsourced": [p.to_dict() for p in ps.unsourced()],
        "text": ps.audit(),
    }


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "model": "DJN", "set_id": base_case().set_id}
"""
Objective 2: the levelised cost of compute-grade electricity.

    "to model the levelised cost of compute-grade electricity across candidate
     Nigerian sites as a function of gas price, generation efficiency, and
     climate-driven cooling load"

Each of the three drivers named in the objective appears explicitly below:
gas price in the fuel term, generation efficiency in the heat rate, and
climate-driven cooling load in the site-adjusted PUE.

Busbar cost versus compute-grade cost
-------------------------------------
Ordinary LCOE stops at the busbar: the cost of a kWh leaving the generator.
That is not what a data centre pays for. Only 1/PUE of that kWh reaches the
accelerators; the rest runs cooling, power conversion and lighting. So the cost
of a kWh of USEFUL compute power is the busbar cost multiplied by PUE.

    LCOE_compute-grade = LCOE_busbar x PUE

This is the distinction the word "compute-grade" in the objective is doing, and
it is where climate enters the economics. A hotter, wetter site raises PUE,
which raises the cost of every compute kWh without the generator being any less
efficient. That is the mechanism the site comparison exists to show.

Comparator
----------
Uranbold and Lima (2025) find solar plus battery lowest at 25.11 US dollars per
megawatt-hour, with natural gas competitive where reliability binds. That is a
busbar figure, so it must be compared against busbar LCOE, not against the
compute-grade figure. Comparing it to the post-PUE number would overstate the
gas penalty. `SOLAR_BATTERY_BENCHMARK_USD_PER_MWH` below is the only sourced
comparator in this module.
"""

from __future__ import annotations

import numpy as np

from .netback import HOURS_PER_YEAR, annualised_to_hourly, capital_recovery_factor
from .sites import CANDIDATE_SITES, Site, cooling_adjusted_pue

# Uranbold and Lima, 2025. Busbar, solar plus battery storage.
SOLAR_BATTERY_BENCHMARK_USD_PER_MWH = 25.11

BTU_PER_MMBTU = 1_000_000.0


def fuel_cost_per_kwh(
    gas_price_usd_per_mmbtu: float | np.ndarray,
    heat_rate_btu_per_kwh: float | np.ndarray,
) -> float | np.ndarray:
    """Fuel cost of one kWh at the busbar.

    Heat rate is Btu consumed per kWh produced, so dividing by a million gives
    MMBtu per kWh, and multiplying by the gas price gives dollars per kWh.
    Base case: 2.18 x 7,000 / 1,000,000 = 0.01526 US$/kWh, about 1.5 US cents.
    """
    return gas_price_usd_per_mmbtu * heat_rate_btu_per_kwh / BTU_PER_MMBTU


def lcoe_busbar(p: dict) -> dict[str, np.ndarray]:
    """Levelised cost of a kWh leaving the generator, split by component.

    Returned as a breakdown rather than a single number because the interface
    shows the stack, and because the whole argument of the study turns on how
    small the fuel slice is relative to the capital slice.
    """
    annual_capital = p["plant_capex_per_kw"] * capital_recovery_factor(
        p["discount_rate"], p["plant_life"]
    )
    capital = annualised_to_hourly(annual_capital, p["plant_availability"])
    fixed_om = np.asarray(p["plant_opex_per_kwh"], dtype=float)
    fuel = fuel_cost_per_kwh(p["gas_price_power"], p["heat_rate"])

    total = np.asarray(capital + fixed_om + fuel, dtype=float)
    return {
        "capital": np.asarray(capital, dtype=float),
        "fixed_om": fixed_om,
        "fuel": np.asarray(fuel, dtype=float),
        "total": total,
    }


def lcoe_compute_grade(p: dict, pue: float | np.ndarray | None = None) -> dict[str, np.ndarray]:
    """Cost of one kWh that actually reaches an accelerator.

    Pass `pue` to override the parameter set, which is how the site loop feeds
    in a climate-adjusted value.
    """
    busbar = lcoe_busbar(p)
    effective_pue = p["pue"] if pue is None else pue
    scaled = {k: np.asarray(v * effective_pue, dtype=float) for k, v in busbar.items()}
    scaled["pue_applied"] = np.asarray(effective_pue, dtype=float)
    scaled["busbar_total"] = busbar["total"]
    return scaled


def lcoe_by_site(p: dict, sites: dict[str, Site] | None = None) -> list[dict]:
    """Objective 2, delivered: every candidate site ranked by compute-grade cost.

    The generator is identical at every site. The only things that move are PUE,
    through climate, and the gas price, through access. Any difference in the
    ranking is therefore attributable to siting alone, which is exactly the
    question the objective asks.
    """
    sites = sites or CANDIDATE_SITES
    rows = []

    for key, site in sites.items():
        site_pue = cooling_adjusted_pue(
            site,
            base_pue=float(np.asarray(p["pue"]).reshape(-1)[0]),
            reference_temp_c=float(np.asarray(p["reference_temp_c"]).reshape(-1)[0]),
            temp_coefficient=float(np.asarray(p["pue_temp_coefficient"]).reshape(-1)[0]),
            humidity_coefficient=float(np.asarray(p["pue_humidity_coefficient"]).reshape(-1)[0]),
        )

        # Flare gas has no domestic offtake and no regulated price, so it is
        # charged at a discount to the wholesale schedule. Doc1's third
        # separating condition rests on this same distinction.
        site_params = dict(p)
        if site.gas_access in ("flare", "both"):
            site_params["gas_price_power"] = (
                p["gas_price_power"] * p["flare_gas_discount"]
            )

        result = lcoe_compute_grade(site_params, pue=site_pue)
        total = float(np.asarray(result["total"]).reshape(-1)[0])
        busbar_total = float(np.asarray(result["busbar_total"]).reshape(-1)[0])

        rows.append({
            "key": key,
            "name": site.name,
            "state": site.state,
            "pue": site_pue,
            "gas_access": site.gas_access,
            "flare_distance_km": site.flare_distance_km,
            "fibre_quality": site.fibre_quality,
            "gas_price_applied": float(
                np.asarray(site_params["gas_price_power"]).reshape(-1)[0]
            ),
            "lcoe_busbar_usd_per_kwh": busbar_total,
            "lcoe_compute_usd_per_kwh": total,
            "lcoe_compute_usd_per_mwh": total * 1_000.0,
            "lcoe_compute_us_cents_per_kwh": total * 100.0,
            "components_usd_per_kwh": {
                "capital": float(np.asarray(result["capital"]).reshape(-1)[0]),
                "fixed_om": float(np.asarray(result["fixed_om"]).reshape(-1)[0]),
                "fuel": float(np.asarray(result["fuel"]).reshape(-1)[0]),
            },
            "fuel_share": float(
                np.asarray(result["fuel"]).reshape(-1)[0] / total
            ),
            "vs_solar_battery_busbar": busbar_total * 1_000.0
            - SOLAR_BATTERY_BENCHMARK_USD_PER_MWH,
            "note": site.note,
        })

    rows.sort(key=lambda r: r["lcoe_compute_usd_per_kwh"])
    return rows
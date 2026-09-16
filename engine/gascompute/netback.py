"""
Netback across the four competing uses of one MMBtu of Nigerian gas.

Definition used throughout
--------------------------
Netback is the value the gas itself can command at the wellhead. It is the
revenue earned by the final product, less every cost incurred downstream of
the wellhead, expressed per MMBtu of gas consumed. The gas price is NOT
subtracted: the netback IS the implied gas price, and comparing it against the
regulated price is what tells you whether the pathway clears.

The discipline that keeps the comparison honest
-----------------------------------------------
All four pathways use the same cost boundary. Capital recovery is included on
every pathway or on none. Mixing boundaries is the standard way a netback
ranking gets attacked in a viva, and it is the main reason this module keeps
each pathway's cost list explicit rather than folding costs into a constant.

Two Nigeria-specific corrections that are easy to miss and change the ranking
-----------------------------------------------------------------------------
Grid power  The tariff is not the revenue. A large share of energy sent out is
            never billed or never collected (NERC's ATC&C losses). Netting back
            at the headline tariff overstates what grid power earns. Since the
            study's argument is about compute competing with national supply,
            overstating the grid side would be the self-serving direction, so
            the conservative treatment is also the credible one.

LNG         Liquefaction burns a share of the feed gas. Only the surviving
            fraction is ever sold. Forgetting this shrinkage inflates LNG
            netback, and LNG is compute's closest rival in the ranking.
"""

from __future__ import annotations

import numpy as np

from .compute_unit import accelerator_hours_per_mmbtu, electricity_from_gas

HOURS_PER_YEAR = 8_760.0


def capital_recovery_factor(
    discount_rate: float | np.ndarray,
    life_years: float | np.ndarray,
) -> float | np.ndarray:
    """Annual payment that repays one unit of capital over its life.

        CRF = r(1+r)^n / ((1+r)^n - 1)

    Used instead of straight-line depreciation because it carries the cost of
    capital, which in the Nigerian setting is the dominant term. A 15 per cent
    discount rate is not a detail here; it is most of the answer.
    """
    r = np.asarray(discount_rate, dtype=float)
    n = np.asarray(life_years, dtype=float)
    growth = (1.0 + r) ** n
    return r * growth / (growth - 1.0)


def annualised_to_hourly(
    annual_cost: float | np.ndarray,
    availability: float | np.ndarray,
) -> float | np.ndarray:
    """Spread an annual cost over the hours the asset actually runs.

    Availability below 1.0 raises the hourly cost, because the same capital is
    recovered over fewer productive hours.
    """
    return annual_cost / (HOURS_PER_YEAR * availability)


# ----------------------------------------------------------------------------
# Pathway 1: embedded AI compute
# ----------------------------------------------------------------------------

def compute_cost_per_accelerator_hour(
    accelerator_capex_usd: float | np.ndarray,
    accelerator_life_years: float | np.ndarray,
    facility_capex_usd_per_kw: float | np.ndarray,
    facility_life_years: float | np.ndarray,
    accelerator_kw: float | np.ndarray,
    pue: float | np.ndarray,
    opex_usd_per_accelerator_hour: float | np.ndarray,
    discount_rate: float | np.ndarray,
    availability: float | np.ndarray,
) -> dict[str, np.ndarray]:
    """Non-gas cash cost of delivering one accelerator-hour.

    Three components, kept separate because the interface shows them separately
    and because the sensitivity analysis needs to attribute variance to each.

    Facility capex is charged on the FULL facility draw, not just the chip, so
    the accelerator's share of the building is its own kW multiplied by PUE.
    Charging only the chip's kW would quietly omit the cooling plant, which in a
    Nigerian climate is the part under most stress.
    """
    acc_annual = accelerator_capex_usd * capital_recovery_factor(
        discount_rate, accelerator_life_years
    )
    acc_hourly = annualised_to_hourly(acc_annual, availability)

    facility_kw_per_accelerator = accelerator_kw * pue
    fac_capex = facility_capex_usd_per_kw * facility_kw_per_accelerator
    fac_annual = fac_capex * capital_recovery_factor(discount_rate, facility_life_years)
    fac_hourly = annualised_to_hourly(fac_annual, availability)

    opex = np.asarray(opex_usd_per_accelerator_hour, dtype=float)

    return {
        "accelerator_capital": np.asarray(acc_hourly, dtype=float),
        "facility_capital": np.asarray(fac_hourly, dtype=float),
        "operating": opex,
        "total": np.asarray(acc_hourly + fac_hourly + opex, dtype=float),
    }


def netback_compute(p: dict) -> np.ndarray:
    """Dollars per MMBtu implied by selling the gas as accelerator-hours."""
    ah = accelerator_hours_per_mmbtu(
        p["heat_rate"], p["pue"], p["accelerator_kw"], p["utilisation"]
    )
    cost = compute_cost_per_accelerator_hour(
        accelerator_capex_usd=p["accelerator_capex"],
        accelerator_life_years=p["accelerator_life"],
        facility_capex_usd_per_kw=p["facility_capex_per_kw"],
        facility_life_years=p["facility_life"],
        accelerator_kw=p["accelerator_kw"],
        pue=p["pue"],
        opex_usd_per_accelerator_hour=p["compute_opex"],
        discount_rate=p["discount_rate"],
        availability=p["availability"],
    )
    margin_per_hour = p["gpu_hour_price"] - cost["total"]
    return np.asarray(ah * margin_per_hour, dtype=float)


# ----------------------------------------------------------------------------
# Pathway 2: grid power
# ----------------------------------------------------------------------------

def netback_grid(p: dict) -> np.ndarray:
    """Dollars per MMBtu implied by selling the gas as grid electricity.

    Revenue is the tariff reduced by ATC&C losses, because energy that is lost,
    unbilled or uncollected earns nothing. Costs are the generator's own capital
    recovery and fixed operating cost, charged per MMBtu of fuel burned.
    """
    kwh = electricity_from_gas(p["heat_rate"])
    realised_price = p["electricity_tariff"] * (1.0 - p["atc_c_losses"])
    revenue = kwh * realised_price

    plant_annual = p["plant_capex_per_kw"] * capital_recovery_factor(
        p["discount_rate"], p["plant_life"]
    )
    plant_hourly_per_kw = annualised_to_hourly(plant_annual, p["plant_availability"])
    # one MMBtu burned at the stated heat rate yields `kwh`, so the fixed cost
    # attributable to that MMBtu is the per-kWh fixed cost times those kWh
    fixed_per_kwh = plant_hourly_per_kw  # per kW-hour of output = per kWh
    cost = kwh * (fixed_per_kwh + p["plant_opex_per_kwh"])

    return np.asarray(revenue - cost, dtype=float)


# ----------------------------------------------------------------------------
# Pathway 3: fertiliser feedstock (ammonia and urea)
# ----------------------------------------------------------------------------

def netback_fertiliser(p: dict) -> np.ndarray:
    """Dollars per MMBtu implied by using the gas as urea feedstock.

    Gas intensity carries both roles gas plays in a urea plant: it is the
    hydrogen feedstock and it fires the process. One number covers both, which
    is how the trade literature reports it.
    """
    margin_per_tonne = p["urea_price"] - p["urea_conversion_cost"]
    return np.asarray(margin_per_tonne / p["urea_gas_intensity"], dtype=float)


# ----------------------------------------------------------------------------
# Pathway 4: LNG export
# ----------------------------------------------------------------------------

def netback_lng(p: dict) -> np.ndarray:
    """Dollars per MMBtu of FEED gas implied by exporting it as LNG.

    Order of operations matters. Shipping and regasification are charged on the
    delivered LNG, so they are netted off the destination price first, and the
    result is scaled by the fraction of feed gas that survives liquefaction.
    Liquefaction cost is charged on the feed gas itself.
    """
    delivered_margin = (
        p["lng_destination_price"] - p["lng_shipping"] - p["lng_regas"]
    )
    surviving = 1.0 - p["lng_shrinkage"]
    return np.asarray(delivered_margin * surviving - p["lng_liquefaction"], dtype=float)


# ----------------------------------------------------------------------------
# All four together
# ----------------------------------------------------------------------------

PATHWAYS = {
    "compute": netback_compute,
    "grid": netback_grid,
    "fertiliser": netback_fertiliser,
    "lng": netback_lng,
}

PATHWAY_LABELS = {
    "compute": "Embedded AI compute",
    "grid": "Grid power",
    "fertiliser": "Fertiliser feedstock",
    "lng": "LNG export",
}


def netback_all(p: dict) -> dict[str, np.ndarray]:
    """Every pathway, same units, same boundary."""
    return {name: fn(p) for name, fn in PATHWAYS.items()}


def best_alternative_to_compute(p: dict) -> np.ndarray:
    """The comparator the break-even is solved against.

    Compute does not have to beat the sum of the alternatives, only the best
    one, because the gas can only go one way.

    The regulated price is a floor on that comparator, and leaving it out was a
    real error. If every alternative route nets back less than the regulated
    wholesale price, the gas does not get sold into a loss-making route: it
    stays in the ground, or goes to whoever will pay the schedule. So the
    opportunity cost of taking that gas is never lower than what the seller can
    already get for it. Without this floor the model would report a break-even
    below the regulated price, which is a price at which no transaction would
    happen in the first place.
    """
    others = np.vstack(
        [np.atleast_1d(PATHWAYS[k](p)) for k in ("grid", "fertiliser", "lng")]
    )
    best = others.max(axis=0)

    # the regulated wholesale price is the floor described above
    floor = np.atleast_1d(np.asarray(p["gas_price_power"], dtype=float))
    best = np.maximum(best, floor)

    # vstack forces at least one dimension, so a single scenario would come back
    # as a length-1 array. Collapse it to 0-d to match the other pathway
    # functions, which return a scalar in, scalar out.
    return best if best.size > 1 else best.reshape(())


def binding_comparator(p: dict) -> tuple[str, float]:
    """Which constraint is actually setting the break-even, and at what level.

    The interface needs this to say something true rather than something
    generic. "Compute has to beat fertiliser" and "compute has to beat the
    price the gas already fetches" are different sentences, and only one of
    them is correct at any given setting.
    """
    values = {k: float(np.asarray(PATHWAYS[k](p)).reshape(-1)[0])
              for k in ("grid", "fertiliser", "lng")}
    floor = float(np.asarray(p["gas_price_power"], dtype=float).reshape(-1)[0])

    best_name = max(values, key=lambda k: values[k])
    if values[best_name] >= floor:
        return best_name, values[best_name]
    return "regulated_price", floor
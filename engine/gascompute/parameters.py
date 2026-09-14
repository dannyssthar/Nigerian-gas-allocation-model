"""
The base-case parameter snapshot.

READ THIS BEFORE CITING ANY RESULT
-----------------------------------
Only a handful of these values are sourced. The rest are openly marked WORKING:
they are plausible placeholders chosen so the model runs end to end, and they
are NOT evidence. They must be replaced with sourced figures before any number
from this engine appears in a results chapter.

`ParameterSet.unsourced()` returns the list of everything still outstanding, and
the interface renders that list to the user rather than hiding it. Run
`python -m gascompute.parameters` to print the audit.

Snapshot discipline
-------------------
Set ids are frozen. When a price feed updates, it writes a NEW set id; it never
edits an existing one. A thesis result cites its set id, so an examiner can
reproduce the exact figure years later.
"""

from __future__ import annotations

from .provenance import Parameter, ParameterSet, Provenance

# ---------------------------------------------------------------------------
# Short citations, UIMS style. Expand in the reference list, not here.
# ---------------------------------------------------------------------------
NMDPRA = "Nigerian Midstream and Downstream Petroleum Regulatory Authority, 2026"
NERC = "Nigerian Electricity Regulatory Commission, 2025"
DOC2 = "Document 2, stated working value"


def base_case() -> ParameterSet:
    """Parameter set v0.1, September 2026."""
    ps = ParameterSet(
        set_id="base-2026-09",
        description=(
            "Initial working snapshot. Gas price sourced from the NMDPRA 2026 "
            "wholesale framework. Physical chain as stated in Document 2. "
            "The full cost stack is unsourced and must be replaced before any "
            "figure is reported as a finding."
        ),
    )

    # -- gas ---------------------------------------------------------------
    ps.add(Parameter(
        "gas_price_power", "Gas price, power sector", 2.18, "US$/MMBtu",
        Provenance.SOURCED, citation=NMDPRA,
        note="Regulated wholesale price effective 1 April 2026.",
    ))
    ps.add(Parameter(
        "gas_price_industry", "Gas price, gas-based industry", 1.54, "US$/MMBtu",
        Provenance.SOURCED, citation=NMDPRA, low=0.90, high=2.18,
        note="Band for ammonia and urea. Midpoint taken as the base case.",
    ))

    # -- the Document 2 chain ---------------------------------------------
    ps.add(Parameter(
        "heat_rate", "Turbine heat rate", 7_000.0, "Btu/kWh",
        Provenance.WORKING, low=6_300.0, high=8_500.0, note=DOC2,
    ))
    ps.add(Parameter(
        "pue", "Power usage effectiveness", 1.50, "ratio",
        Provenance.WORKING, low=1.30, high=1.80,
        note=DOC2 + ". Nigerian climate raises cooling load; the upper bound matters.",
    ))
    ps.add(Parameter(
        "accelerator_kw", "Accelerator rated power", 0.70, "kW",
        Provenance.WORKING, low=0.35, high=1.40, note=DOC2,
    ))
    ps.add(Parameter(
        "utilisation", "Accelerator utilisation", 0.80, "fraction",
        Provenance.WORKING, low=0.60, high=0.95, note=DOC2,
    ))

    # -- compute cost stack (ALL UNSOURCED) --------------------------------
    ps.add(Parameter(
        "accelerator_capex", "Accelerator capital cost", 30_000.0, "US$ each",
        Provenance.WORKING, low=15_000.0, high=45_000.0,
        note="Placeholder for a current-generation training accelerator. Source before use.",
    ))
    ps.add(Parameter(
        "accelerator_life", "Accelerator economic life", 3.0, "years",
        Provenance.WORKING, low=2.0, high=6.0,
        note="Short life is the defining feature of compute economics and drives the break-even.",
    ))
    ps.add(Parameter(
        "facility_capex_per_kw", "Facility capital cost", 9_000.0, "US$/kW",
        Provenance.WORKING, low=5_000.0, high=16_000.0,
        note="Shell, power train and cooling. Nigerian build cost unverified.",
    ))
    ps.add(Parameter(
        "facility_life", "Facility economic life", 15.0, "years",
        Provenance.WORKING, low=10.0, high=25.0,
    ))
    ps.add(Parameter(
        "compute_opex", "Compute operating cost", 0.25, "US$/accelerator-hour",
        Provenance.WORKING, low=0.08, high=0.60,
        note="Staff, network, bandwidth, maintenance. Excludes energy, which is the gas.",
    ))
    ps.add(Parameter(
        "discount_rate", "Discount rate", 0.15, "fraction",
        Provenance.WORKING, low=0.10, high=0.28,
        note="Nigerian project cost of capital. Dominant term in every capital charge.",
    ))
    ps.add(Parameter(
        "availability", "Data-centre availability", 0.90, "fraction",
        Provenance.WORKING, low=0.75, high=0.98,
    ))
    ps.add(Parameter(
        "gpu_hour_price", "Compute price", 2.60, "US$/accelerator-hour",
        Provenance.WORKING, low=1.20, high=6.00,
        note="The decision variable. Marketplace spot rates differ sharply from "
             "hyperscaler contract rates; state which is meant.",
    ))

    # -- grid pathway ------------------------------------------------------
    ps.add(Parameter(
        "electricity_tariff", "Electricity tariff", 0.14, "US$/kWh",
        Provenance.WORKING, low=0.07, high=0.22,
        note="Naira tariff converted at an unverified rate. Two sources needed: tariff order and FX.",
    ))
    ps.add(Parameter(
        "atc_c_losses", "ATC&C losses", 0.35, "fraction",
        Provenance.WORKING, low=0.20, high=0.50,
        note="Energy sent out but never billed or collected. Verify against " + NERC + ".",
    ))
    ps.add(Parameter(
        "plant_capex_per_kw", "Generator capital cost", 1_100.0, "US$/kW",
        Provenance.WORKING, low=700.0, high=1_800.0,
    ))
    ps.add(Parameter(
        "plant_life", "Generator life", 25.0, "years",
        Provenance.WORKING, low=20.0, high=30.0,
    ))
    ps.add(Parameter(
        "plant_availability", "Generator availability", 0.75, "fraction",
        Provenance.WORKING, low=0.50, high=0.90,
    ))
    ps.add(Parameter(
        "plant_opex_per_kwh", "Generator non-fuel operating cost", 0.006, "US$/kWh",
        Provenance.WORKING, low=0.003, high=0.012,
    ))

    # -- fertiliser pathway -------------------------------------------------
    ps.add(Parameter(
        "urea_price", "Urea price, FOB", 400.0, "US$/tonne",
        Provenance.WORKING, low=230.0, high=650.0,
        note="Candidate live feed: World Bank Pink Sheet, monthly.",
    ))
    ps.add(Parameter(
        "urea_conversion_cost", "Urea non-gas conversion cost", 120.0, "US$/tonne",
        Provenance.WORKING, low=70.0, high=200.0,
        note="Plant capital recovery, catalyst, labour, bagging, inland freight.",
    ))
    ps.add(Parameter(
        "urea_gas_intensity", "Gas per tonne of urea", 26.0, "MMBtu/tonne",
        Provenance.WORKING, low=22.0, high=32.0,
        note="Feedstock and process fuel combined.",
    ))

    # -- LNG pathway --------------------------------------------------------
    ps.add(Parameter(
        "lng_destination_price", "LNG delivered price", 11.00, "US$/MMBtu",
        Provenance.WORKING, low=5.00, high=22.00,
        note="Candidate live feed: World Bank Pink Sheet LNG series.",
    ))
    ps.add(Parameter(
        "lng_liquefaction", "Liquefaction cost", 2.50, "US$/MMBtu feed",
        Provenance.WORKING, low=1.50, high=4.00,
    ))
    ps.add(Parameter(
        "lng_shipping", "Shipping cost", 1.20, "US$/MMBtu delivered",
        Provenance.WORKING, low=0.50, high=2.50,
    ))
    ps.add(Parameter(
        "lng_regas", "Regasification cost", 0.50, "US$/MMBtu delivered",
        Provenance.WORKING, low=0.30, high=0.90,
    ))
    ps.add(Parameter(
        "lng_shrinkage", "Liquefaction fuel shrinkage", 0.10, "fraction",
        Provenance.WORKING, low=0.07, high=0.15,
        note="Feed gas burned to run the liquefaction train. Omitting this overstates LNG.",
    ))

    # -- siting and climate (Objective 2) -----------------------------------
    ps.add(Parameter(
        "reference_temp_c", "Reference ambient temperature", 26.0, "deg C",
        Provenance.WORKING,
        note="Temperature at which the base PUE holds. Abuja's mean is the anchor.",
    ))
    ps.add(Parameter(
        "pue_temp_coefficient", "PUE rise per degree", 0.030, "PUE/deg C",
        Provenance.WORKING, low=0.010, high=0.060,
        note="Linear placeholder. The defensible version uses wet-bulb hours "
             "from a NiMet or ERA5 series, not a single coefficient.",
    ))
    ps.add(Parameter(
        "pue_humidity_coefficient", "PUE rise per unit humidity", 0.45, "PUE/fraction RH",
        Provenance.WORKING, low=0.10, high=0.90,
        note="Humidity degrades evaporative cooling. Referenced to 0.62 RH. "
             "This is the weakest assumption in the site model; say so.",
    ))
    ps.add(Parameter(
        "flare_gas_discount", "Flare gas price discount", 0.50, "multiplier",
        Provenance.WORKING, low=0.20, high=1.00,
        note="Flare gas has no domestic offtake and no regulated price. "
             "1.00 means no discount, which is the conservative test.",
    ))

    return ps


if __name__ == "__main__":
    ps = base_case()
    print(ps.audit())
    print(f"Outstanding sourcing tasks: {len(ps.unsourced())}")
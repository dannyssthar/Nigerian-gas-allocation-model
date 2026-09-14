"""
Golden tests.

These lock the engine to the figures already published in the proposal and in
Document 2. If a refactor changes 170.07, the test fails and the thesis is
protected. This file is the fastest available answer to "is this tool real":
it is a machine-checked assertion that the code does what the document says.

Run:  python -m pytest tests/ -v
"""

import numpy as np
import pytest

from gascompute.compute_unit import (
    accelerator_hours_per_mmbtu,
    chain_breakdown,
    electricity_from_gas,
)
from gascompute.netback import capital_recovery_factor, netback_all
from gascompute.parameters import base_case
from gascompute.provenance import Parameter, Provenance
from gascompute.uncertainty import breakeven_gpu_price, run_uncertainty


# ---------------------------------------------------------------------------
# Document 2, section 2: the chain
# ---------------------------------------------------------------------------

def test_electricity_from_gas_matches_document_2():
    """1,000,000 / 7,000 = 142.86 kWh per MMBtu."""
    assert electricity_from_gas(7_000.0) == pytest.approx(142.86, abs=0.01)


def test_compute_grade_electricity_matches_document_2():
    """142.86 / 1.50 = 95.24 kWh reaching the accelerators."""
    b = chain_breakdown(7_000.0, 1.50, 0.70, 0.80)
    assert b["compute_grade_kwh"] == pytest.approx(95.24, abs=0.01)


def test_accelerator_draw_matches_document_2():
    """0.70 kW at 0.80 utilisation = 0.56 kWh per accelerator-hour."""
    b = chain_breakdown(7_000.0, 1.50, 0.70, 0.80)
    assert b["draw_kwh_per_accelerator_hour"] == pytest.approx(0.56, abs=1e-9)


def test_headline_conversion_is_170_07():
    """THE golden number. Stated in Document 2 and in section 3.4 of the
    proposal. This assertion is what makes the tool citable."""
    ah = accelerator_hours_per_mmbtu(7_000.0, 1.50, 0.70, 0.80)
    assert ah == pytest.approx(170.07, abs=0.01)


def test_chain_conserves_energy():
    """Compute-grade kWh plus overhead must equal generated kWh."""
    b = chain_breakdown(7_000.0, 1.50, 0.70, 0.80)
    assert b["compute_grade_kwh"] + b["overhead_kwh"] == pytest.approx(
        b["electricity_kwh"], rel=1e-12
    )


def test_chain_vectorises_identically():
    """Array input must give the same answer as scalar input, because the
    Monte Carlo layer depends on it."""
    scalar = accelerator_hours_per_mmbtu(7_000.0, 1.50, 0.70, 0.80)
    arr = accelerator_hours_per_mmbtu(
        np.full(5, 7_000.0), np.full(5, 1.50), np.full(5, 0.70), np.full(5, 0.80)
    )
    assert np.allclose(arr, scalar)


# ---------------------------------------------------------------------------
# Finance
# ---------------------------------------------------------------------------

def test_capital_recovery_factor_known_value():
    """10 per cent over 10 years is a textbook 0.16275."""
    assert capital_recovery_factor(0.10, 10.0) == pytest.approx(0.162745, abs=1e-6)


def test_crf_rises_as_life_shortens():
    """Shorter life means a heavier annual charge. This is why accelerator life
    dominates the compute cost stack."""
    assert capital_recovery_factor(0.15, 3.0) > capital_recovery_factor(0.15, 10.0)


# ---------------------------------------------------------------------------
# Netback
# ---------------------------------------------------------------------------

def test_all_four_pathways_return_finite_numbers():
    nb = netback_all(base_case().values())
    assert set(nb) == {"compute", "grid", "fertiliser", "lng"}
    for name, value in nb.items():
        assert np.isfinite(value), f"{name} is not finite"


def test_lng_shrinkage_reduces_netback():
    """Guards the error this module exists to prevent: omitting the feed gas
    burned during liquefaction overstates LNG."""
    p = base_case().values()
    with_shrink = netback_all(dict(p, lng_shrinkage=0.10))["lng"]
    without = netback_all(dict(p, lng_shrinkage=0.0))["lng"]
    assert with_shrink < without


def test_atc_c_losses_reduce_grid_netback():
    """Netting back at the headline tariff would overstate grid power."""
    p = base_case().values()
    with_losses = netback_all(dict(p, atc_c_losses=0.35))["grid"]
    without = netback_all(dict(p, atc_c_losses=0.0))["grid"]
    assert with_losses < without


def test_compute_netback_rises_with_gpu_price():
    p = base_case().values()
    cheap = netback_all(dict(p, gpu_hour_price=2.0))["compute"]
    dear = netback_all(dict(p, gpu_hour_price=4.0))["compute"]
    assert dear > cheap


# ---------------------------------------------------------------------------
# Break-even
# ---------------------------------------------------------------------------

def test_breakeven_is_a_true_root():
    """At the break-even price, compute netback must equal its best
    alternative. This is the test that the solver is solving the right thing."""
    from gascompute.netback import best_alternative_to_compute, netback_compute

    p = base_case().values()
    be = breakeven_gpu_price(p)
    at_root = dict(p, gpu_hour_price=be)
    assert float(netback_compute(at_root)) == pytest.approx(
        float(best_alternative_to_compute(p)), abs=1e-6
    )


# ---------------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------------

def test_sourced_parameter_requires_citation():
    with pytest.raises(ValueError):
        Parameter("x", "X", 1.0, "unit", Provenance.SOURCED)


def test_base_value_must_lie_inside_its_range():
    with pytest.raises(ValueError):
        Parameter("x", "X", 99.0, "unit", Provenance.WORKING, low=0.0, high=1.0)


def test_unsourced_parameters_are_declared_not_hidden():
    """The engine must be able to say what it does not know."""
    assert len(base_case().unsourced()) > 0


def test_uncertainty_run_is_reproducible():
    a = run_uncertainty(base_case(), n=512, seed=7)
    b = run_uncertainty(base_case(), n=512, seed=7)
    assert a["pathways"]["compute"]["p50"] == b["pathways"]["compute"]["p50"]


# ---------------------------------------------------------------------------
# Objective 2: LCOE
# ---------------------------------------------------------------------------

def test_fuel_cost_per_kwh_base_case():
    """2.18 US$/MMBtu at 7,000 Btu/kWh is about 1.53 US cents per kWh."""
    from gascompute.lcoe import fuel_cost_per_kwh

    assert fuel_cost_per_kwh(2.18, 7_000.0) == pytest.approx(0.01526, abs=1e-5)


def test_compute_grade_lcoe_exceeds_busbar_by_pue():
    """The definition of 'compute-grade': only 1/PUE of a busbar kWh reaches
    the chips, so the useful kWh costs PUE times as much."""
    from gascompute.lcoe import lcoe_busbar, lcoe_compute_grade

    p = base_case().values()
    busbar = float(lcoe_busbar(p)["total"])
    compute = float(lcoe_compute_grade(p)["total"])
    assert compute == pytest.approx(busbar * p["pue"], rel=1e-12)


def test_hotter_site_costs_more():
    """Climate-driven cooling load is the mechanism Objective 2 asks about.
    Holding gas access equal, the hotter site must be dearer."""
    from gascompute.lcoe import lcoe_by_site
    from gascompute.sites import CANDIDATE_SITES

    p = base_case().values()
    pipeline_only = {
        k: v for k, v in CANDIDATE_SITES.items() if v.gas_access == "pipeline"
    }
    rows = lcoe_by_site(p, pipeline_only)
    by_name = {r["name"]: r for r in rows}
    assert by_name["Lagos"]["pue"] > by_name["Abuja"]["pue"]
    assert (
        by_name["Lagos"]["lcoe_compute_usd_per_kwh"]
        > by_name["Abuja"]["lcoe_compute_usd_per_kwh"]
    )


def test_flare_discount_lowers_cost_at_delta_sites():
    from gascompute.lcoe import lcoe_by_site

    p = base_case().values()
    discounted = {r["key"]: r for r in lcoe_by_site(p)}
    undiscounted = {r["key"]: r for r in lcoe_by_site(dict(p, flare_gas_discount=1.0))}
    assert (
        discounted["rivers"]["lcoe_compute_usd_per_kwh"]
        < undiscounted["rivers"]["lcoe_compute_usd_per_kwh"]
    )
    # Lagos has no flare access, so the discount must not touch it
    assert discounted["lagos"]["lcoe_compute_usd_per_kwh"] == pytest.approx(
        undiscounted["lagos"]["lcoe_compute_usd_per_kwh"]
    )


def test_lcoe_components_sum_to_total():
    from gascompute.lcoe import lcoe_by_site

    for r in lcoe_by_site(base_case().values()):
        parts = sum(r["components_usd_per_kwh"].values())
        assert parts == pytest.approx(r["lcoe_compute_usd_per_kwh"], rel=1e-12)


def test_every_site_declares_working_provenance():
    """No site attribute is sourced yet, and the engine must say so."""
    from gascompute.provenance import Provenance
    from gascompute.sites import CANDIDATE_SITES

    assert all(s.provenance is Provenance.WORKING for s in CANDIDATE_SITES.values())
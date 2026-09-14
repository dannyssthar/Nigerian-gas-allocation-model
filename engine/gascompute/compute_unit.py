"""
The gas-to-compute chain.

This is Document 2 turned into code, step for step. Nothing here is new: it is
the same three conversions, in the same order, with the same units. The golden
test asserts that the base case returns 170.07 accelerator-hours per MMBtu,
which is the figure already stated in the proposal and in Document 2.

Chain
-----
    1 MMBtu of gas
      -> electricity        divide by heat rate, convert Btu to kWh
      -> compute-grade kWh  divide by PUE (cooling and facility overhead)
      -> accelerator-hours  divide by accelerator draw per hour

Every function takes plain floats and returns plain floats so that it can be
called once (deterministic base case) or a hundred thousand times on numpy
arrays (Monte Carlo) without any change.
"""

from __future__ import annotations

import numpy as np

BTU_PER_MMBTU = 1_000_000.0


def electricity_from_gas(heat_rate_btu_per_kwh: float | np.ndarray) -> float | np.ndarray:
    """kWh of electricity generated from one MMBtu of gas.

    A lower heat rate means a more efficient turbine, so this is a division.
    Base case: 1,000,000 / 7,000 = 142.86 kWh.
    """
    return BTU_PER_MMBTU / heat_rate_btu_per_kwh


def compute_grade_electricity(
    facility_kwh: float | np.ndarray,
    pue: float | np.ndarray,
) -> float | np.ndarray:
    """kWh that actually reaches the accelerators.

    Power usage effectiveness is total facility power divided by IT power, so
    the share reaching the chips is 1/PUE. Everything else is cooling, power
    conversion and lighting. Base case: 142.86 / 1.50 = 95.24 kWh.
    """
    return facility_kwh / pue


def accelerator_draw(
    accelerator_kw: float | np.ndarray,
    utilisation: float | np.ndarray,
) -> float | np.ndarray:
    """kWh drawn by one accelerator over one hour at the stated utilisation.

    Base case: 0.70 kW x 0.80 = 0.56 kWh per accelerator-hour.
    """
    return accelerator_kw * utilisation


def accelerator_hours_per_mmbtu(
    heat_rate_btu_per_kwh: float | np.ndarray,
    pue: float | np.ndarray,
    accelerator_kw: float | np.ndarray,
    utilisation: float | np.ndarray,
) -> float | np.ndarray:
    """The headline conversion: accelerator-hours obtained from one MMBtu.

    Base case: 142.86 -> 95.24 -> 95.24 / 0.56 = 170.07 accelerator-hours.

    Note on utilisation, because it reads backwards at first glance. Raising
    utilisation raises the draw per accelerator, so FEWER accelerators can be
    run from the same gas. It does not change the work done, only how that work
    is packed into machines. Revenue per accelerator-hour is the price of work
    delivered, so the model stays consistent as long as the same utilisation is
    used on both the energy side and the revenue side. It is.
    """
    facility_kwh = electricity_from_gas(heat_rate_btu_per_kwh)
    compute_kwh = compute_grade_electricity(facility_kwh, pue)
    draw = accelerator_draw(accelerator_kw, utilisation)
    return compute_kwh / draw


def chain_breakdown(
    heat_rate_btu_per_kwh: float,
    pue: float,
    accelerator_kw: float,
    utilisation: float,
) -> dict[str, float]:
    """Every intermediate step, for the 'show your working' panel in the UI.

    Users trust a number they can watch being built. This returns the same
    figures Document 2 prints in prose, so the screen and the document can
    never drift apart.
    """
    facility_kwh = electricity_from_gas(heat_rate_btu_per_kwh)
    compute_kwh = compute_grade_electricity(facility_kwh, pue)
    draw = accelerator_draw(accelerator_kw, utilisation)
    return {
        "gas_mmbtu": 1.0,
        "electricity_kwh": float(facility_kwh),
        "compute_grade_kwh": float(compute_kwh),
        "overhead_kwh": float(facility_kwh - compute_kwh),
        "draw_kwh_per_accelerator_hour": float(draw),
        "accelerator_hours": float(compute_kwh / draw),
    }
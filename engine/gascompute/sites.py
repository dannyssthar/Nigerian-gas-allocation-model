"""
Candidate sites.

Objective 2 requires the cost of compute-grade electricity to vary "across
candidate Nigerian sites", and Objective 4 turns on whether flare gas and
siting requirements overlap in space. Both need a site list, so this is it.

The geography that makes the study interesting
-----------------------------------------------
Compute clusters in Lagos: 21 of the 28 Nigerian facilities (TechNext, 2026).
Flare gas sits in the Niger Delta, several hundred kilometres away. The claim
that gas-to-compute is low-carbon because it burns gas that would otherwise be
flared quietly assumes those are the same place. They are not. Making the
distance explicit is what lets the tool test the claim instead of repeating it.

WARNING ON THESE VALUES
-----------------------
Every site attribute below is a WORKING placeholder. The climate figures are
rough, not drawn from a meteorological series, and the flare distances are
indicative rather than measured. They exist so the site dimension runs end to
end. Replace them before any site-level figure is reported:

  climate      NiMet station normals, or ERA5 reanalysis for wet-bulb
  flare sites  NUPRC flare tracker coordinates
  gas access   NNPC / NGIC pipeline network maps

Wet-bulb, not dry-bulb, is what governs evaporative cooling. Lagos and Abuja
sit at similar dry-bulb temperatures but very different humidity, and that
difference is precisely what the cooling model should capture. The current
placeholder uses dry-bulb because that is what is easy to find, which is a
known weakness and is flagged here rather than hidden.
"""

from __future__ import annotations

from dataclasses import dataclass

from .provenance import Provenance


@dataclass(frozen=True)
class Site:
    """A candidate location for a gas-to-compute facility."""

    key: str
    name: str
    state: str
    mean_temp_c: float           # annual mean dry-bulb, degrees Celsius
    mean_humidity: float         # annual mean relative humidity, fraction
    gas_access: str              # "pipeline", "flare", or "both"
    flare_distance_km: float     # to the nearest significant flare site
    fibre_quality: str           # "landing", "metro", "regional"
    note: str = ""

    @property
    def provenance(self) -> Provenance:
        """No site attribute is sourced yet. Stated, not implied."""
        return Provenance.WORKING


CANDIDATE_SITES: dict[str, Site] = {
    "lagos": Site(
        "lagos", "Lagos", "Lagos",
        mean_temp_c=27.0, mean_humidity=0.82,
        gas_access="pipeline", flare_distance_km=320.0, fibre_quality="landing",
        note="Where the demand actually is: 21 of 28 national facilities. "
             "Submarine cable landing point. Furthest from flare gas.",
    ),
    "ogun": Site(
        "ogun", "Ogun", "Ogun",
        mean_temp_c=26.5, mean_humidity=0.80,
        gas_access="pipeline", flare_distance_km=300.0, fibre_quality="metro",
        note="Lagos overspill. Cheaper land, same pipeline, same fibre latency.",
    ),
    "rivers": Site(
        "rivers", "Port Harcourt", "Rivers",
        mean_temp_c=26.5, mean_humidity=0.85,
        gas_access="both", flare_distance_km=15.0, fibre_quality="metro",
        note="Flare gas on the doorstep. The low-carbon pathway lives or dies here.",
    ),
    "bayelsa": Site(
        "bayelsa", "Yenagoa", "Bayelsa",
        mean_temp_c=26.8, mean_humidity=0.87,
        gas_access="flare", flare_distance_km=8.0, fibre_quality="regional",
        note="Closest to flare gas, weakest connectivity. The trade-off in its purest form.",
    ),
    "delta": Site(
        "delta", "Warri", "Delta",
        mean_temp_c=27.2, mean_humidity=0.84,
        gas_access="both", flare_distance_km=20.0, fibre_quality="regional",
    ),
    "abuja": Site(
        "abuja", "Abuja", "FCT",
        mean_temp_c=26.0, mean_humidity=0.62,
        gas_access="pipeline", flare_distance_km=480.0, fibre_quality="metro",
        note="Markedly drier, so evaporative cooling works better. Policy-driven "
             "alternative. Furthest of all from flare gas.",
    ),
}


def cooling_adjusted_pue(
    site: Site,
    base_pue: float,
    reference_temp_c: float,
    temp_coefficient: float,
    humidity_coefficient: float,
) -> float:
    """PUE at a given site, adjusted for its climate.

        PUE_site = PUE_base
                 + temp_coef     x (T_site - T_reference)
                 + humidity_coef x (RH_site - RH_reference)

    A linear adjustment is deliberately crude. Real cooling performance is not
    linear in either variable, and the honest version uses wet-bulb hours from a
    weather series. This form is transparent, its two coefficients are exposed
    as parameters so a user can challenge them, and it is openly labelled as a
    placeholder. That is better than an opaque correlation that looks precise.

    Humidity is referenced to Abuja's 0.62 because the drier site is the
    favourable case for evaporative cooling, so the adjustment is a penalty
    applied to wetter sites rather than a bonus to drier ones.
    """
    temp_effect = temp_coefficient * (site.mean_temp_c - reference_temp_c)
    humidity_effect = humidity_coefficient * (site.mean_humidity - 0.62)
    return base_pue + temp_effect + humidity_effect


def flare_gas_available(site: Site, max_distance_km: float) -> bool:
    """Whether the flare-gas pathway is physically credible at this site.

    Used by the carbon engine and by Doc1's third separating condition: gas
    diverted from an existing domestic obligation carries a crowd-out cost,
    whereas otherwise-flared gas carries almost none.
    """
    return site.gas_access in ("flare", "both") and site.flare_distance_km <= max_distance_km
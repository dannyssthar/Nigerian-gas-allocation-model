"""
Provenance for every number in the model.

The rule this module enforces: a parameter cannot exist without declaring
where it came from. Chapter 4 results must be traceable to a citation or
openly labelled as an untested working value, and the interface shows that
label to the user. Burying an invented number inside a default is the single
easiest way to lose a viva, so the type system makes it impossible.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Provenance(str, Enum):
    """How much weight a number can carry."""

    SOURCED = "sourced"          # published figure, citable, fixed
    DERIVED = "derived"          # computed from other parameters in this model
    WORKING = "working"          # plausible placeholder, NOT yet sourced
    USER = "user"                # supplied at run time by whoever is using the tool


@dataclass(frozen=True)
class Parameter:
    """A single model input.

    Attributes
    ----------
    name        machine name, used as the key everywhere
    label       human name shown in the interface
    value       the base-case (P50) value
    unit        unit string, shown next to the value
    provenance  see Provenance above
    citation    UIMS-style short citation, required when provenance is SOURCED
    low, high   bounds of the uncertainty range used by the sampler.
                When both are None the parameter is treated as fixed.
    note        why this value, or what would have to happen to source it
    """

    name: str
    label: str
    value: float
    unit: str
    provenance: Provenance
    citation: str | None = None
    low: float | None = None
    high: float | None = None
    note: str = ""

    def __post_init__(self) -> None:
        if self.provenance is Provenance.SOURCED and not self.citation:
            raise ValueError(f"{self.name}: a SOURCED parameter must carry a citation")
        if (self.low is None) != (self.high is None):
            raise ValueError(f"{self.name}: give both low and high, or neither")
        if self.low is not None and self.high is not None:
            if not (self.low <= self.value <= self.high):
                raise ValueError(
                    f"{self.name}: base value {self.value} is outside its range "
                    f"[{self.low}, {self.high}]"
                )

    @property
    def is_uncertain(self) -> bool:
        return self.low is not None and self.high is not None

    @property
    def needs_sourcing(self) -> bool:
        return self.provenance is Provenance.WORKING

    def to_dict(self) -> dict:
        """Shape the interface consumes. Keys stay stable; the front end
        relies on them to render the provenance tag beside each field."""
        return {
            "name": self.name,
            "label": self.label,
            "value": self.value,
            "unit": self.unit,
            "provenance": self.provenance.value,
            "citation": self.citation,
            "low": self.low,
            "high": self.high,
            "note": self.note,
        }


@dataclass
class ParameterSet:
    """A named, versioned collection of parameters.

    Versioning is what makes a result citable. A run stamps the set id it used,
    so a reader can reproduce the exact figure in the thesis even after live
    price feeds have moved on. Live feeds write a NEW set; they never mutate
    an existing one.
    """

    set_id: str
    description: str
    parameters: dict[str, Parameter] = field(default_factory=dict)

    def add(self, p: Parameter) -> "ParameterSet":
        if p.name in self.parameters:
            raise ValueError(f"duplicate parameter {p.name}")
        self.parameters[p.name] = p
        return self

    def __getitem__(self, name: str) -> Parameter:
        return self.parameters[name]

    def value(self, name: str) -> float:
        return self.parameters[name].value

    def values(self) -> dict[str, float]:
        """Base-case values, keyed by name. This is the deterministic run."""
        return {n: p.value for n, p in self.parameters.items()}

    def uncertain(self) -> list[Parameter]:
        return [p for p in self.parameters.values() if p.is_uncertain]

    def unsourced(self) -> list[Parameter]:
        """Everything a reader is entitled to challenge. The interface lists
        these openly rather than waiting to be asked."""
        return [p for p in self.parameters.values() if p.needs_sourcing]

    def audit(self) -> str:
        """Plain-text provenance report. Print this in the repo README and at
        the top of any results notebook."""
        lines = [f"Parameter set: {self.set_id}", self.description, ""]
        for prov in Provenance:
            group = [p for p in self.parameters.values() if p.provenance is prov]
            if not group:
                continue
            lines.append(f"{prov.value.upper()} ({len(group)})")
            for p in sorted(group, key=lambda x: x.name):
                src = p.citation or p.note or ""
                lines.append(f"  {p.label}: {p.value:,.4g} {p.unit}    {src}")
            lines.append("")
        return "\n".join(lines)
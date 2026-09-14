"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { ParameterDef } from "@/lib/api";
import { dpFor, num, stepFor } from "@/lib/api";
import type { GLOSSARY } from "@/lib/glossary";
import { ProvenanceChip } from "./Primitives";
import { Info, Unit } from "./Tooltip";

/**
 * The controls.
 *
 * Grouped by the question each group answers rather than by where the value
 * lives in the code, and ordered by influence: Sobol puts compute price,
 * accelerator power, capital cost and life at the top of the variance, so
 * those are reachable without scrolling.
 *
 * Every group carries a one-line explanation, and every slider carries its
 * unit as a hoverable abbreviation and a provenance chip. A reader should
 * never meet a control and wonder what it does or where its default came from.
 */

interface Group {
  title: string;
  explain: string;
  keys: string[];
  glossary?: keyof typeof GLOSSARY;
}

const GROUPS: Group[] = [
  {
    title: "The decision",
    explain:
      "The two prices the whole answer turns on. Compute price alone explains more than half the variance in the result.",
    keys: ["gpu_hour_price", "gas_price_power"],
  },
  {
    title: "Gas to compute",
    explain:
      "The physical chain: how much computing one unit of gas can actually buy. Efficiency and cooling load live here.",
    keys: ["heat_rate", "pue", "accelerator_kw", "utilisation"],
    glossary: "acceleratorHour",
  },
  {
    title: "Cost of running the chips",
    explain:
      "What a data centre spends per chip-hour before any gas is bought. None of these is sourced yet, so this is the group most worth overriding with your own figures.",
    keys: [
      "accelerator_capex",
      "accelerator_life",
      "facility_capex_per_kw",
      "compute_opex",
      "discount_rate",
      "availability",
    ],
    glossary: "crf",
  },
  {
    title: "The competing uses",
    explain:
      "What the same gas would earn as fertiliser, as LNG, or as grid power. Raise any of these and compute has more to beat.",
    keys: [
      "urea_price",
      "urea_gas_intensity",
      "lng_destination_price",
      "lng_shrinkage",
      "electricity_tariff",
      "atc_c_losses",
    ],
    glossary: "netback",
  },
  {
    title: "Siting and climate",
    explain:
      "How much a hotter, wetter site costs in extra cooling, and how much cheaper flare gas is than pipeline gas.",
    keys: ["pue_temp_coefficient", "pue_humidity_coefficient", "flare_gas_discount"],
    glossary: "flareGas",
  },
];

/** Maps a parameter's unit string onto a glossary entry, so units are
 *  explained without every slider needing its own annotation. */
const UNIT_TERMS: Record<string, keyof typeof GLOSSARY> = {
  "US$/MMBtu": "USDMMBtu",
  "Btu/kWh": "Btu",
  kW: "MW",
  "US$/kW": "MW",
  "US$/accelerator-hour": "acceleratorHour",
  "US$/kWh": "kWh",
  "US$/tonne": "MMBtu",
  "MMBtu/tonne": "MMBtu",
  "US$/MMBtu feed": "LNGabbr",
  "US$/MMBtu delivered": "LNGabbr",
  ratio: "PUEabbr",
  "PUE/deg C": "PUEabbr",
  "PUE/fraction RH": "PUEabbr",
};

export default function ParameterRail({
  parameters,
  values,
  onChange,
  onReset,
  busy,
  onClose,
}: {
  parameters: ParameterDef[];
  values: Record<string, number>;
  onChange: (name: string, value: number) => void;
  onReset: () => void;
  busy: boolean;
  onClose?: () => void;
}) {
  const byName = new Map(parameters.map((p) => [p.name, p]));
  const touched = Object.keys(values).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s8)" }}>
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="djn-eyebrow djn-eyebrow--accent">Your assumptions</p>
          {onClose && (
            <button className="djn-btn djn-btn--ghost" onClick={onClose} style={{ padding: "6px 12px" }}>
              Done
            </button>
          )}
        </div>
        <p style={{ fontSize: "var(--fs-micro)", color: "var(--text-tertiary)", marginTop: "var(--s2)", lineHeight: 1.6 }}>
          Disagree with a number? Change it. The model recomputes in under a third of a second, and
          every figure on the page moves with it.
        </p>

        <AnimatePresence>
          {touched > 0 && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onClick={onReset}
              className="djn-btn"
              style={{ marginTop: "var(--s4)", width: "100%", overflow: "hidden" }}
            >
              Reset {touched} change{touched > 1 ? "s" : ""}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {GROUPS.map((group, gi) => {
        const defs = group.keys
          .map((k) => byName.get(k))
          .filter((d): d is ParameterDef => Boolean(d));
        if (!defs.length) return null;

        return (
          <section key={group.title} style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
            <div>
              <h3
                className="djn-title"
                style={{ fontSize: "var(--fs-sm)", fontWeight: 720, display: "flex", alignItems: "center" }}
              >
                {group.title}
                {group.glossary && <Info k={group.glossary} />}
              </h3>
              <p style={{ fontSize: "var(--fs-micro)", color: "var(--text-muted)", marginTop: 5, lineHeight: 1.6 }}>
                {group.explain}
              </p>
            </div>

            {defs.map((def, di) => (
              <Slider
                key={def.name}
                def={def}
                value={values[def.name] ?? def.value}
                overridden={def.name in values}
                onChange={(v) => onChange(def.name, v)}
                /* the very first slider gets the tour hook and a soft pulse,
                   so a new visitor has an obvious place to start */
                tourTarget={gi === 0 && di === 0}
              />
            ))}
          </section>
        );
      })}

      <p style={{ fontSize: "var(--fs-micro)", color: "var(--text-muted)", borderTop: "1px solid var(--line)", paddingTop: "var(--s4)" }}>
        {busy ? "Recomputing the model" : "Every change re-runs all four pathways."}
      </p>
    </div>
  );
}

function Slider({
  def,
  value,
  overridden,
  onChange,
  tourTarget,
}: {
  def: ParameterDef;
  value: number;
  overridden: boolean;
  onChange: (v: number) => void;
  tourTarget?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const low = def.low ?? def.value * 0.5;
  const high = def.high ?? def.value * 1.5;
  const dp = dpFor(low, high);
  const fill = ((value - low) / (high - low)) * 100;
  const unitTerm = UNIT_TERMS[def.unit];

  return (
    <div className="djn-field" data-tour={tourTarget ? "rail" : undefined}>
      <div className="djn-field__top">
        <label htmlFor={def.name}>{def.label}</label>
        <span
          className="tnum"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-sm)",
            fontWeight: 680,
            color: overridden ? "var(--accent-text)" : "var(--text-primary)",
          }}
        >
          {num(value, dp)}
        </span>
      </div>

      <input
        id={def.name}
        type="range"
        className={`djn-range${tourTarget && !overridden ? " djn-hint" : ""}`}
        min={low}
        max={high}
        step={stepFor(low, high)}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={`${def.name}-meta`}
        aria-valuetext={`${num(value, dp)} ${def.unit}`}
        style={{ ["--fill" as string]: `${fill}%` }}
      />

      <div id={`${def.name}-meta`} className="flex items-center justify-between gap-2">
        <span className="djn-data-label">
          {unitTerm ? <Unit k={unitTerm}>{def.unit}</Unit> : def.unit}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`Show where ${def.label} came from`}
          data-tour={tourTarget ? "chip" : undefined}
        >
          <ProvenanceChip kind={overridden ? "user" : def.provenance} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <p
              style={{
                fontSize: "var(--fs-micro)",
                color: "var(--text-tertiary)",
                lineHeight: 1.65,
                padding: "var(--s3)",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--r-sm)",
                userSelect: "text",
              }}
            >
              {def.citation ? (
                <>
                  <strong style={{ color: "var(--status-success)" }}>Sourced. </strong>
                  {def.citation}.{" "}
                </>
              ) : (
                <>
                  <strong style={{ color: "var(--accent-text)" }}>Not yet sourced. </strong>
                </>
              )}
              {def.note}
              <br />
              <span style={{ color: "var(--text-muted)" }}>
                Range tested: {num(low, dp)} to {num(high, dp)} {def.unit}
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { ParameterDef } from "@/lib/api";
import { dpFor, num, stepFor } from "@/lib/api";
import { ProvenanceChip } from "./Primitives";

/** Which controls appear, and under which heading. Ordered by how much each
 *  moves the answer, so the parameters that matter are reachable without
 *  scrolling: Sobol puts compute price, accelerator power, capex and life at
 *  the top of the variance. */
const GROUPS: { title: string; keys: string[]; note?: string }[] = [
  {
    title: "The decision",
    keys: ["gpu_hour_price", "gas_price_power"],
    note: "Compute price drives more than half the variance in the result.",
  },
  {
    title: "Gas to compute",
    keys: ["heat_rate", "pue", "accelerator_kw", "utilisation"],
    note: "The chain set out in Document 2.",
  },
  {
    title: "Compute cost stack",
    keys: [
      "accelerator_capex",
      "accelerator_life",
      "facility_capex_per_kw",
      "compute_opex",
      "discount_rate",
      "availability",
    ],
    note: "None of these is sourced yet. Override them with your own figures.",
  },
  {
    title: "Competing uses",
    keys: [
      "urea_price",
      "urea_gas_intensity",
      "lng_destination_price",
      "lng_shrinkage",
      "electricity_tariff",
      "atc_c_losses",
    ],
  },
  {
    title: "Siting and climate",
    keys: ["pue_temp_coefficient", "pue_humidity_coefficient", "flare_gas_discount"],
  },
];

export default function ParameterRail({
  parameters,
  values,
  onChange,
  onReset,
  busy,
}: {
  parameters: ParameterDef[];
  values: Record<string, number>;
  onChange: (name: string, value: number) => void;
  onReset: () => void;
  busy: boolean;
}) {
  const byName = new Map(parameters.map((p) => [p.name, p]));
  const touched = Object.keys(values).length;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between gap-3">
        <p className="djn-eyebrow">Scenario inputs</p>
        <AnimatePresence>
          {touched > 0 && (
            <motion.button
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6 }}
              onClick={onReset}
              className="djn-eyebrow djn-eyebrow--accent"
              style={{ cursor: "pointer" }}
            >
              Reset {touched}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {GROUPS.map((group) => {
        const defs = group.keys
          .map((k) => byName.get(k))
          .filter((d): d is ParameterDef => Boolean(d));
        if (!defs.length) return null;

        return (
          <section key={group.title} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3
                className="djn-title"
                style={{ fontSize: "var(--fs-sm)", fontWeight: 700 }}
              >
                {group.title}
              </h3>
              {group.note && (
                <p style={{ fontSize: "var(--fs-micro)", color: "var(--text-muted)" }}>
                  {group.note}
                </p>
              )}
            </div>

            {defs.map((def) => (
              <Slider
                key={def.name}
                def={def}
                value={values[def.name] ?? def.value}
                overridden={def.name in values}
                onChange={(v) => onChange(def.name, v)}
              />
            ))}
          </section>
        );
      })}

      <p
        style={{
          fontSize: "var(--fs-micro)",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--line)",
          paddingTop: "var(--s4)",
        }}
      >
        {busy ? "Recomputing" : "Every change re-runs the full model."}
      </p>
    </div>
  );
}

function Slider({
  def,
  value,
  overridden,
  onChange,
}: {
  def: ParameterDef;
  value: number;
  overridden: boolean;
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const low = def.low ?? def.value * 0.5;
  const high = def.high ?? def.value * 1.5;
  const dp = dpFor(low, high);
  const fill = ((value - low) / (high - low)) * 100;

  return (
    <div className="djn-field">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={def.name}>{def.label}</label>
        <span
          className="tnum"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            color: overridden ? "var(--accent-text)" : "var(--text-primary)",
          }}
        >
          {num(value, dp)}
        </span>
      </div>

      <input
        id={def.name}
        type="range"
        className="djn-range"
        min={low}
        max={high}
        step={stepFor(low, high)}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
        aria-describedby={`${def.name}-meta`}
      />

      <div
        id={`${def.name}-meta`}
        className="flex items-center justify-between gap-2"
      >
        <span className="djn-data-label">{def.unit}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <ProvenanceChip
            kind={overridden ? "user" : def.provenance}
            title={def.citation ?? def.note}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
            style={{
              overflow: "hidden",
              fontSize: "var(--fs-micro)",
              color: "var(--text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            {def.citation ? `Source: ${def.citation}. ` : ""}
            {def.note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
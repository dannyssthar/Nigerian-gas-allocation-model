"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ChainDiagram from "@/components/ChainDiagram";
import ParameterRail from "@/components/ParameterRail";
import { BreakevenPanel, Distribution, NetbackChart, SiteTable } from "@/components/Results";
import { CountUp } from "@/components/Primitives";
import ThemeToggle from "@/components/ThemeToggle";
import {
  getParameters,
  money,
  runScenario,
  type ParametersResponse,
  type ScenarioResponse,
} from "@/lib/api";

export default function Page() {
  const [meta, setMeta] = useState<ParametersResponse | null>(null);
  const [data, setData] = useState<ScenarioResponse | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pane, setPane] = useState<"inputs" | "results">("results");

  /* A slider drag fires dozens of change events. Debouncing to one call per
     140ms keeps the engine from being hammered while still feeling immediate,
     and the abort controller cancels any run whose answer is already stale. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  const compute = useCallback(async (ov: Record<string, number>) => {
    const mine = ++generation.current;
    setBusy(true);
    try {
      const res = await runScenario(ov, { draws: 4096, includeSamples: true });
      if (mine === generation.current) {
        setData(res);
        setError(null);
      }
    } catch (e) {
      if (mine === generation.current) {
        setError(e instanceof Error ? e.message : "The engine did not respond.");
      }
    } finally {
      if (mine === generation.current) setBusy(false);
    }
  }, []);

  useEffect(() => {
    getParameters().then(setMeta).catch((e) => setError(e.message));
    compute({});
  }, [compute]);

  function onChange(name: string, value: number) {
    setOverrides((prev) => {
      const next = { ...prev, [name]: value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => compute(next), 140);
      return next;
    });
  }

  function onReset() {
    setOverrides({});
    compute({});
  }

  return (
    <div className="djn-shell">
      {/* ── controls ─────────────────────────────────────────────── */}
      <aside
        className="djn-rail"
        style={{ display: pane === "inputs" ? "block" : undefined }}
        data-pane={pane}
      >
        <div style={{ marginBottom: "var(--s8)" }}>
          <p className="djn-eyebrow djn-eyebrow--accent">Gas Allocation Model</p>
          <h1
            className="djn-display"
            style={{ fontSize: "1.9rem", marginTop: 6, letterSpacing: "-0.03em" }}
          >
            DJN
          </h1>
          <p
            style={{
              fontSize: "var(--fs-micro)",
              color: "var(--text-muted)",
              marginTop: "var(--s2)",
              lineHeight: 1.6,
            }}
          >
            DanJohn&ndash;Nwobi. CPEEL, University of Ibadan.
            {meta && (
              <>
                <br />
                Parameter set {meta.set_id} &middot; {meta.sourced_count} sourced,{" "}
                {meta.unsourced_count} not yet
              </>
            )}
          </p>
        </div>

        {meta ? (
          <ParameterRail
            parameters={meta.parameters}
            values={overrides}
            onChange={onChange}
            onReset={onReset}
            busy={busy}
          />
        ) : (
          <p className="djn-data-label">Loading parameters</p>
        )}
      </aside>

      {/* ── results ──────────────────────────────────────────────── */}
      <main
        style={{
          padding: "var(--s8) var(--s6) var(--s24)",
          display: pane === "results" ? "block" : undefined,
        }}
      >
        <div style={{ maxWidth: 1080, marginInline: "auto", display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div style={{ maxWidth: "62ch" }}>
              <p className="djn-eyebrow">Powering compute or powering the nation</p>
              <h2
                className="djn-title"
                style={{ fontSize: "var(--fs-title)", marginTop: "var(--s2)" }}
              >
                A decision-support tool for siting AI data centres in Nigeria
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {busy && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="djn-data-label"
                  >
                    Recomputing
                  </motion.span>
                )}
              </AnimatePresence>
              <ThemeToggle />
            </div>
          </header>

          {error && (
            <div
              className="djn-card djn-squircle-sm"
              style={{
                padding: "var(--s5)",
                borderColor: "color-mix(in srgb,var(--status-error) 40%,transparent)",
              }}
            >
              <p className="djn-eyebrow" style={{ color: "var(--status-error)" }}>
                The engine is not reachable
              </p>
              <p style={{ fontSize: "var(--fs-sm)", marginTop: 8, color: "var(--text-secondary)" }}>
                {error}
              </p>
            </div>
          )}

          {data && (
            <>
              <Verdict data={data} />
              <ChainDiagram data={data} />
              <NetbackChart data={data} />
              <BreakevenPanel data={data} />
              {data.samples && (
                <Distribution
                  samples={data.samples.breakeven}
                  p10={data.breakeven.p10}
                  p50={data.breakeven.p50}
                  p90={data.breakeven.p90}
                />
              )}
              <SiteTable data={data} />
              <Standing data={data} />
            </>
          )}

          <footer
            style={{
              marginTop: "var(--s8)",
              paddingTop: "var(--s5)",
              borderTop: "1px solid var(--line)",
              fontSize: "var(--fs-micro)",
              color: "var(--text-muted)",
              lineHeight: 1.7,
            }}
          >
            DanJohn&ndash;Nwobi Gas Allocation Model, working version.
            {data && (
              <>
                {" "}Parameter set {data.set_id}, seed {data.seed}, {data.draws.toLocaleString()} Latin
                Hypercube draws. Cite the set id and seed with any figure taken from this tool.
              </>
            )}
          </footer>
        </div>
      </main>

      {/* Always visible on narrow screens, never scrolled away. */}
      <nav className="djn-mobile-switch" aria-label="Switch pane">
        <button onClick={() => setPane("inputs")} aria-pressed={pane === "inputs"}>
          Inputs
        </button>
        <button onClick={() => setPane("results")} aria-pressed={pane === "results"}>
          Results
        </button>
      </nav>
    </div>
  );
}

/**
 * The verdict.
 *
 * One sentence and one number, because a decision-support tool should answer
 * before it explains. Everything below this block is the working.
 */
function Verdict({ data }: { data: ScenarioResponse }) {
  const winner = data.netback.find((n) => n.key === data.winner);
  const runnerUp = data.netback[1];
  if (!winner) return null;

  const margin = runnerUp ? winner.value / runnerUp.value : 1;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="djn-card djn-squircle-lg"
      style={{ padding: "var(--s8) var(--s6)", background: "var(--bg-secondary)" }}
    >
      <p className="djn-eyebrow djn-eyebrow--accent">The answer</p>

      <p
        className="djn-display"
        style={{ fontSize: "var(--fs-display-2xl)", marginTop: "var(--s4)" }}
      >
        <CountUp value={winner.value} decimals={2} prefix="$" />
      </p>
      <p className="djn-data-label" style={{ marginTop: 6 }}>
        per MMBtu as {winner.label.toLowerCase()}
      </p>

      <p
        style={{
          fontSize: "var(--fs-lead)",
          color: "var(--text-secondary)",
          marginTop: "var(--s5)",
          maxWidth: "58ch",
          lineHeight: 1.6,
        }}
      >
        {winner.key === "compute" ? (
          <>
            Compute out-earns every other use of the same gas, by{" "}
            <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              {margin.toFixed(1)} times
            </strong>{" "}
            over {runnerUp?.label.toLowerCase()}. It stops winning below{" "}
            {money(data.breakeven.point)} per accelerator-hour.
          </>
        ) : (
          <>
            {winner.label} earns most at these settings. Compute would need{" "}
            {money(data.breakeven.point)} per accelerator-hour to overtake it.
          </>
        )}
      </p>
    </motion.section>
  );
}

/**
 * What the model does not yet know, stated rather than discovered.
 */
function Standing({ data }: { data: ScenarioResponse }) {
  const objectives = [
    { n: 1, text: "Value gas across four pathways and establish the break-even", done: true },
    { n: 2, text: "Levelised cost of compute-grade electricity by site", done: true },
    { n: 3, text: "Opportunity cost in connections and agro-capacity", done: false },
    { n: 4, text: "Carbon intensity by gas-supply pathway", done: false },
    { n: 5, text: "Open, accessible tool and regulatory implications", done: false },
  ];

  return (
    <div className="djn-card djn-squircle" style={{ padding: "var(--s6)" }}>
      <p className="djn-eyebrow djn-eyebrow--accent">Standing</p>
      <h2 className="djn-title" style={{ fontSize: "var(--fs-h2)", marginTop: 4 }}>
        What is built, and what is not
      </h2>

      <ul style={{ marginTop: "var(--s5)", display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
        {objectives.map((o) => (
          <li key={o.n} className="flex items-start gap-3">
            <span
              className="djn-data-label"
              style={{ width: 18, flexShrink: 0, paddingTop: 2, color: "var(--text-muted)" }}
            >
              {o.n}
            </span>
            <span
              style={{
                fontSize: "var(--fs-sm)",
                color: o.done ? "var(--text-primary)" : "var(--text-tertiary)",
                flex: 1,
              }}
            >
              {o.text}
            </span>
            <span className="djn-chip" data-prov={o.done ? "sourced" : "derived"}>
              {o.done ? "Built" : "Scheduled"}
            </span>
          </li>
        ))}
      </ul>

      <p
        style={{
          fontSize: "var(--fs-micro)",
          color: "var(--text-muted)",
          marginTop: "var(--s5)",
          paddingTop: "var(--s4)",
          borderTop: "1px solid var(--line)",
          lineHeight: 1.6,
        }}
      >
        Objectives 3 and 4 are scheduled for October and November 2026 in the project Gantt. Every
        unsourced input is tagged in the panel on the left; none of the figures above should be quoted
        as a finding until those are replaced. Parameter set {data.set_id}.
      </p>
    </div>
  );
}
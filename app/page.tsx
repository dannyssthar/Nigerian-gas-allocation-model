"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ChainDiagram from "@/components/ChainDiagram";
import Hero from "@/components/Hero";
import { Method, Standing } from "@/components/Method";
import Nav from "@/components/Nav";
import ParameterRail from "@/components/ParameterRail";
import { Skeleton } from "@/components/Primitives";
import {
  BreakevenPanel,
  Distribution,
  NetbackChart,
  SiteTable,
  Verdict,
} from "@/components/Results";
import Walkthrough, { useWalkthrough } from "@/components/Walkthrough";
import {
  getParameters,
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
  const [sheet, setSheet] = useState(false);

  const tour = useWalkthrough();

  /* A slider drag fires dozens of events. Debouncing to one call per 140 ms
     keeps the engine from being hammered while still feeling immediate, and
     the generation counter discards any response whose answer is already
     stale, so a fast drag can never leave the page showing an older run. */
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

  // Lock the page behind the bottom sheet, so a scroll gesture moves the
  // sheet's own content rather than the article underneath it.
  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  return (
    <>
      <Nav onReplayTour={tour.start} />

      <Hero onStart={tour.start} />

      <div className="djn-workbench">
        {/* Visibility is controlled only by data-open, never an inline style.
            On desktop the media query makes it a static sidebar and the
            attribute is inert. */}
        <aside
          className="djn-rail"
          data-open={sheet}
          aria-label="Model assumptions"
          aria-hidden={false}
        >
          {meta ? (
            <ParameterRail
              parameters={meta.parameters}
              values={overrides}
              onChange={onChange}
              onReset={onReset}
              busy={busy}
              onClose={sheet ? () => setSheet(false) : undefined}
            />
          ) : (
            <p className="djn-data-label">Loading assumptions</p>
          )}
        </aside>

        <main className="djn-results">
          <div style={{ maxWidth: 1020, marginInline: "auto", display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="djn-explain" style={{ maxWidth: "58ch" }}>
                Everything below recomputes live from the assumptions panel. Hover any underlined
                term or circled <strong style={{ color: "var(--text-primary)" }}>i</strong> for a
                plain-English definition you can select and copy.
              </p>
              <AnimatePresence>
                {busy && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="djn-data-label"
                    style={{ color: "var(--accent-text)" }}
                  >
                    Recomputing
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <div
                className="djn-card djn-squircle-sm"
                style={{
                  padding: "var(--s5)",
                  borderColor: "color-mix(in srgb,var(--status-error) 45%,transparent)",
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

            {data ? (
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
                <Method />
                <Standing data={data} />
              </>
            ) : (
              !error && (
                <>
                  <Skeleton height={210} />
                  <Skeleton height={180} />
                  <Skeleton height={240} />
                </>
              )
            )}

            <footer
              style={{
                marginTop: "var(--s8)",
                paddingTop: "var(--s6)",
                borderTop: "1px solid var(--line)",
                fontSize: "var(--fs-micro)",
                color: "var(--text-muted)",
                lineHeight: 1.8,
              }}
            >
              <strong style={{ color: "var(--text-secondary)" }}>
                DanJohn&ndash;Nwobi Gas Allocation Model
              </strong>
              , working version. Daniel Dan-John, M.Sc. Energy Economics, CPEEL, University of
              Ibadan. Supervisor: Dr. Dilinna Lucy Nwobi.
              {data && (
                <>
                  <br />
                  Parameter set {data.set_id}, seed {data.seed},{" "}
                  {data.draws.toLocaleString()} Latin Hypercube draws. Cite the set id and seed with
                  any figure taken from this tool.
                </>
              )}
            </footer>
          </div>
        </main>
      </div>

      {/* mobile sheet controls */}
      <div className="djn-scrim" data-open={sheet} onClick={() => setSheet(false)} aria-hidden="true" />
      <button
        className="djn-btn djn-btn--accent djn-sheet-trigger"
        onClick={() => setSheet((s) => !s)}
        aria-expanded={sheet}
        style={{ padding: "13px 24px" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="9" cy="7" r="2.4" fill="currentColor" />
          <circle cx="15" cy="12" r="2.4" fill="currentColor" />
          <circle cx="8" cy="17" r="2.4" fill="currentColor" />
        </svg>
        {sheet ? "Close" : "Adjust assumptions"}
      </button>

      {tour.active && <Walkthrough onClose={tour.stop} />}
    </>
  );
}
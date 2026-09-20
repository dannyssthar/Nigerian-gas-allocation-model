"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import ChainDiagram from "@/components/ChainDiagram";
import Hero from "@/components/Hero";
import { Method, Standing } from "@/components/Method";
import Nav from "@/components/Nav";
import ParameterRail from "@/components/ParameterRail";
import Btn from "@/components/Button";
import Sheet from "@/components/Sheet";
import { Skeleton } from "@/components/Primitives";
import {
  BreakevenPanel,
  Distribution,
  NetbackChart,
  SiteTable,
  Verdict,
} from "@/components/Results";
import Walkthrough, { useWalkthrough } from "@/components/Walkthrough";
import { CurrencyProvider } from "@/lib/currency-context";
import {
  getParameters,
  runScenario,
  type ParametersResponse,
  type ScenarioResponse,
} from "@/lib/api";

export default function Page() {
  return (
    <CurrencyProvider>
      <Workbench />
    </CurrencyProvider>
  );
}

function Workbench() {
  const [meta, setMeta] = useState<ParametersResponse | null>(null);
  const [data, setData] = useState<ScenarioResponse | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  /* The Adjust button condenses once the reader is into the content, the way
     iOS large titles do: full sentence while orienting, compact once the
     context is established. The hit target never shrinks — Fitts's law is
     about the target, not the label — only the words condense. */
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 360);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tour = useWalkthrough();

  /* Rendered EITHER in the sidebar OR in the sheet, never both. Rendering both
     and hiding one with CSS would put every slider's id in the document twice,
     which breaks every <label for> on the page. */
  const wide = useMediaQuery("(min-width: 1101px)");

  /* A slider drag fires dozens of events. Debouncing to one call per 140 ms
     keeps the engine from being hammered while still feeling immediate, and
     the generation counter discards any response whose answer is already
     stale, so a fast drag can never leave the page showing an older run. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const inflight = useRef<AbortController | null>(null);

  const compute = useCallback(async (ov: Record<string, number>) => {
    // A superseded run is aborted rather than merely ignored. Dragging a
    // slider used to leave a queue of requests still being computed and sent
    // over the wire, which is wasted engine time and wasted bandwidth for
    // someone on a mobile connection.
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    const mine = ++generation.current;
    setBusy(true);
    try {
      const res = await runScenario(ov, {
        draws: 4096,
        includeSamples: true,
        signal: controller.signal,
      });
      if (mine === generation.current) {
        setData(res);
        setError(null);
      }
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return; // superseded, not failed
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
    <>
      <Nav onReplayTour={tour.start} />

      <Hero onStart={tour.start} />

      <div className="djn-workbench">
        {wide && (
          <aside className="djn-rail" aria-label="Your assumptions">
            {meta ? (
              <ParameterRail
                parameters={meta.parameters}
                values={overrides}
                onChange={onChange}
                onReset={onReset}
                busy={busy}
              />
            ) : (
              <p className="djn-data-label">Loading assumptions</p>
            )}
          </aside>
        )}

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
                NGAM &middot; Nigeria Gas Allocation Model
              </strong>
              , working version. Built by Daniel Dan-John, M.Sc. Energy Economics, CPEEL,
              University of Ibadan.
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

      {!wide && (
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Your assumptions">
          {meta ? (
            <ParameterRail
              parameters={meta.parameters}
              values={overrides}
              onChange={onChange}
              onReset={onReset}
              busy={busy}
            />
          ) : (
            <p className="djn-data-label">Loading assumptions</p>
          )}
        </Sheet>
      )}

      {/* The button and the overlay are the same object in two states, so
          they must never be on screen together — seeing "Adjust" float over
          the opened panel is like seeing a door and its doorway side by side.
          Presence-animated out on open, back in on close. */}
      <AnimatePresence>
        {!sheet && (
          <motion.div
            key="fab"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <Btn
              variant="accent"
              className="djn-fab"
              layout
              onClick={() => setSheet(true)}
              aria-expanded={sheet}
              aria-label="Adjust assumptions"
            >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="9" cy="7" r="2.4" fill="currentColor" />
          <circle cx="15" cy="12" r="2.4" fill="currentColor" />
          <circle cx="8" cy="17" r="2.4" fill="currentColor" />
        </svg>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={condensed ? "s" : "l"}
            layout
            initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {condensed ? "Adjust" : "Adjust assumptions"}
          </motion.span>
        </AnimatePresence>
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>

      {tour.active && <Walkthrough onClose={tour.stop} />}
    </>
  );
}


/**
 * Viewport query as state.
 *
 * Reads false on the server and corrects after mount, which is deliberate: the
 * server has no viewport, so guessing produces a hydration mismatch. The
 * mobile layout is the safe first paint because it is the one that works at
 * every width.
 */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}
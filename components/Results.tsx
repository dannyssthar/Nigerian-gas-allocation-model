"use client";

import { motion } from "framer-motion";
import type { ScenarioResponse } from "@/lib/api";
import { money, num, pct } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { CountUp, ProvenanceChip, SectionHead } from "./Primitives";
import { Info, Term, Unit } from "./Tooltip";

/* ════════════════════════════════════════════════════════════════════
   VERDICT
   ════════════════════════════════════════════════════════════════════ */

/**
 * The answer, before any working.
 *
 * A decision-support tool that makes the reader scroll to find the conclusion
 * has failed at the thing it is named for. One number, one sentence, then the
 * evidence beneath it.
 */
export function Verdict({ data }: { data: ScenarioResponse }) {
  const { fmt, symbol, rate: fx } = useCurrency();
  const winner = data.netback.find((n) => n.key === data.winner);
  const runnerUp = data.netback[1];
  if (!winner) return null;

  const margin = runnerUp && runnerUp.value !== 0 ? winner.value / runnerUp.value : 1;

  return (
    <section
      id="overview"
      className="djn-card djn-squircle-lg djn-section djn-card--raised"
      data-tour="verdict"
      style={{
        padding: "var(--s10) var(--s6)",
        background: "var(--bg-secondary)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <p className="djn-eyebrow djn-eyebrow--accent">The answer</p>

      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--s4)", flexWrap: "wrap", marginTop: "var(--s4)" }}>
        <p className="djn-display" style={{ fontSize: "var(--fs-display-2xl)" }}>
          <CountUp value={winner.value * fx} decimals={winner.value * fx >= 10000 ? 0 : 2} prefix={symbol} />
        </p>
        <p className="djn-data-label">
          per <Unit k="MMBtu" />, as {winner.label.toLowerCase()}
        </p>
      </div>

      <p
        className="djn-measure"
        style={{ fontSize: "var(--fs-lead)", color: "var(--text-secondary)", marginTop: "var(--s5)", lineHeight: 1.7 }}
      >
        {winner.key === "compute" ? (
          <>
            At these assumptions, running AI compute earns more from the same gas than any other
            use, by{" "}
            <strong style={{ color: "var(--accent-text)", fontWeight: 750 }}>
              {margin.toFixed(1)} times
            </strong>{" "}
            over {runnerUp?.label.toLowerCase()}. It stops winning below{" "}
            <strong style={{ color: "var(--text-primary)" }}>{fmt(data.breakeven.point)}</strong>{" "}
            per <Term k="acceleratorHour">accelerator-hour</Term>.
          </>
        ) : (
          <>
            At these assumptions, {winner.label.toLowerCase()} earns most from the gas. Compute
            would need{" "}
            <strong style={{ color: "var(--accent-text)" }}>{fmt(data.breakeven.point)}</strong>{" "}
            per <Term k="acceleratorHour">accelerator-hour</Term> to overtake it.
          </>
        )}
      </p>

      <p
        style={{
          fontSize: "var(--fs-micro)",
          color: "var(--text-tertiary)",
          marginTop: "var(--s6)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <ProvenanceChip kind="working" />
        Most inputs behind this figure are placeholders, not evidence. Treat it as a demonstration
        of the method until they are sourced.
        <Info k="provenance" />
      </p>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   NETBACK
   ════════════════════════════════════════════════════════════════════ */

/**
 * Four pathways on one scale.
 *
 * The winner is the only bar in lime; the rest are grey. Colour-coding four
 * categories would turn this into a rainbow and destroy the one thing the
 * chart is for, which is seeing which bar is longest.
 */
export function NetbackChart({ data }: { data: ScenarioResponse }) {
  const { fmt } = useCurrency();
  const max = Math.max(...data.netback.map((n) => Math.max(n.value, n.p90)));
  const min = Math.min(0, ...data.netback.map((n) => n.p10));
  const span = max - min || 1;
  const x = (v: number) => ((v - min) / span) * 100;

  return (
    <section id="netback" className="djn-card djn-squircle djn-section" data-tour="netback" style={{ padding: "var(--s6)" }}>
      <SectionHead
        eyebrow="Step two"
        title="What that gas earns down each route"
        glossary="netback"
        explain={
          <>
            The same <Unit k="MMBtu" /> could go four ways. Each bar is what the gas itself is worth
            at the wellhead once every downstream cost is paid, so the comparison is arithmetic
            rather than argument. Longer is better.
          </>
        }
        aside={
          <span className="djn-data-label">
            <Unit k="USDMMBtu" /> at the wellhead
          </span>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>
        {data.netback.map((row, i) => {
          const isWinner = row.key === data.winner;
          return (
            <div key={row.key} data-tour={i === 0 ? "whisker" : undefined}>
              <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 7 }}>
                <span
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontWeight: isWinner ? 720 : 560,
                    color: isWinner ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {row.label}
                  {isWinner && (
                    <span className="djn-data-label" style={{ color: "var(--accent-text)", marginLeft: 8 }}>
                      best use
                    </span>
                  )}
                </span>
                <span
                  className="tnum"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 720,
                    color: isWinner ? "var(--accent-text)" : "var(--text-secondary)",
                  }}
                >
                  {fmt(row.value)}
                </span>
              </div>

              <div className="djn-bar-track">
                {/* scaleX from a fixed origin, not width. Width is recomputed
                    by the layout engine on every frame of the tween; a scale
                    is composited on the GPU and never touches layout. The
                    origin sits at the zero line, so a negative netback simply
                    scales negative and grows leftward. */}
                <motion.div
                  className="djn-bar-fill"
                  data-winner={isWinner}
                  initial={false}
                  animate={{ scaleX: (x(row.value) - x(0)) / 100 }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                  style={{ width: "100%", transformOrigin: `${x(0)}% 50%` }}
                />
                <span
                  className="djn-whisker"
                  aria-hidden="true"
                  style={{ left: `${x(row.p10)}%`, width: `${Math.max(x(row.p90) - x(row.p10), 0)}%` }}
                />
                {/* zero line, so a negative bar has a visible anchor */}
                {x(0) > 0.5 && (
                  <span
                    aria-hidden="true"
                    style={{ position: "absolute", top: 0, bottom: 0, left: `${x(0)}%`, width: 1, background: "var(--line-strong)" }}
                  />
                )}
              </div>

              <p className="djn-data-label" style={{ marginTop: 6 }}>
                <Unit k="percentiles">P10</Unit> {fmt(row.p10)} &middot; P50 {fmt(row.p50)}{" "}
                &middot; P90 {fmt(row.p90)}
              </p>
            </div>
          );
        })}
      </div>

      <p className="djn-note">
        <strong style={{ color: "var(--text-primary)" }}>How to read the bracket.</strong> The thin
        bracket across each bar is the range across {data.draws.toLocaleString()}{" "}
        <Unit k="LHSabbr" /> runs, not an error bar. A wide bracket means the result depends heavily
        on assumptions you can change on the left. The regulated gas price for power is{" "}
        {fmt(data.gas_price_power)} per <Unit k="MMBtu" />, so a route only makes sense at all if
        its bar clears that.
      </p>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   BREAK-EVEN
   ════════════════════════════════════════════════════════════════════ */

/**
 * The break-even, and the policy finding underneath it.
 *
 * The headline number is not the break-even but the gap between it and the
 * cash cost of the chip, because that gap is what the gas is actually worth.
 * When it is small, gas pricing cannot steer siting, and that is the study's
 * central result.
 */
export function BreakevenPanel({ data }: { data: ScenarioResponse }) {
  const { fmt, symbol, rate: fx } = useCurrency();
  const b = data.breakeven;
  const gasShare = b.cash_cost > 0 ? b.gas_opportunity_cost / b.cash_cost : 0;

  return (
    <section id="breakeven" className="djn-card djn-squircle djn-section" data-tour="breakeven" style={{ padding: "var(--s6)" }}>
      <SectionHead
        eyebrow="Step three"
        title="Where the answer flips"
        glossary="breakeven"
        explain={
          <>
            Compute only wins while the price of computing stays high enough. This is the price at
            which it stops, found by solving rather than by trial and error, inside every one of the
            uncertainty runs.
          </>
        }
      />

      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--s3)", flexWrap: "wrap" }}>
        <p className="djn-display" style={{ fontSize: "var(--fs-display-xl)", color: "var(--accent-text)" }}>
          <CountUp value={b.point * fx} decimals={b.point * fx >= 10000 ? 0 : 2} prefix={symbol} />
        </p>
        <p className="djn-data-label">
          per <Unit k="acceleratorHour">accelerator-hour</Unit>
        </p>
      </div>

      <p className="djn-explain" style={{ marginTop: "var(--s4)" }}>
        {data.comparator.is_price_floor ? (
          <>
            Right now no other use of the gas even covers what the gas already sells for, so the
            thing compute has to beat is simply that price: {fmt(data.comparator.value)} per unit.
            Below {fmt(b.point)} an hour, nobody would hand the gas over at all.
          </>
        ) : (
          <>
            Below this, the same gas makes more money as{" "}
            {data.comparator.label.toLowerCase()}. Try different assumptions on the left and this
            number moves: across everything the model considers plausible, it lands somewhere
            between {fmt(b.p10)} and {fmt(b.p90)}.
          </>
        )}
      </p>

      <div
        style={{
          marginTop: "var(--s8)",
          paddingTop: "var(--s6)",
          borderTop: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))",
          gap: "var(--s6)",
        }}
      >
        <Metric
          label="Cost of running one chip for an hour"
          value={b.cash_cost * fx}
          dp={b.cash_cost * fx >= 100 ? 2 : 4}
          prefix={symbol}
          caption="Buying the machine, housing it, and keeping it running. Before any gas is paid for."
          glossary="crf"
        />
        <Metric
          label="Value of the gas"
          value={b.gas_opportunity_cost * fx}
          dp={b.gas_opportunity_cost * fx >= 100 ? 2 : 4}
          prefix={symbol}
          caption={`Just ${pct(gasShare, 1)} of what the machine itself costs to run`}
          glossary="opportunityCost"
          accent
        />
        <Metric
          label="Compute wins in"
          value={data.compute_ranks_first_share * 100}
          dp={1}
          suffix="%"
          caption={`Out of ${data.draws.toLocaleString()} runs using every plausible combination of assumptions`}
          glossary="lhs"
        />
      </div>

      {gasShare < 0.1 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: "var(--s6)",
            padding: "var(--s5)",
            borderLeft: "2px solid var(--accent-graphic)",
            background: "var(--accent-wash)",
            borderRadius: "0 var(--r-md) var(--r-md) 0",
          }}
        >
          <p className="djn-eyebrow djn-eyebrow--accent">What this means</p>
          <p
            style={{
              fontSize: "var(--fs-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              marginTop: "var(--s3)",
            }}
          >
            The gas going into one chip-hour is worth {fmt(b.gas_opportunity_cost, 4)}. The chip
            itself costs {fmt(b.cash_cost)} an hour to run. So the gas is under {pct(gasShare, 0)}{" "}
            of the bill.
            <br />
            <br />
            That matters for policy. Nigeria sets the price of this gas, and the natural assumption
            is that the price is a lever: charge more, and data centres go elsewhere. These numbers
            say it is not. A developer deciding where to build would barely notice the difference
            between the cheapest and dearest price on the official schedule. If the country wants a
            say in where this demand lands, the tools that would work are the conditions attached to
            a licence, not the number on the gas bill.
          </p>
        </motion.div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  dp,
  prefix = "",
  suffix = "",
  caption,
  glossary,
  accent = false,
}: {
  label: string;
  value: number;
  dp: number;
  prefix?: string;
  suffix?: string;
  caption: string;
  glossary?: Parameters<typeof Info>[0]["k"];
  accent?: boolean;
}) {
  return (
    <div>
      <p className="djn-eyebrow" style={{ marginBottom: 9, display: "flex", alignItems: "center" }}>
        {label}
        {glossary && <Info k={glossary} />}
      </p>
      <p
        className="djn-display"
        style={{ fontSize: "1.45rem", color: accent ? "var(--accent-text)" : "var(--text-primary)" }}
      >
        <CountUp value={value} decimals={dp} prefix={prefix} suffix={suffix} />
      </p>
      <p style={{ fontSize: "var(--fs-micro)", color: "var(--text-muted)", marginTop: 6, lineHeight: 1.6 }}>
        {caption}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   DISTRIBUTION
   ════════════════════════════════════════════════════════════════════ */

export function Distribution({
  samples,
  p10,
  p50,
  p90,
}: {
  samples: number[];
  p10: number;
  p50: number;
  p90: number;
}) {
  const { fmt, isUSD, code } = useCurrency();
  if (!samples?.length) return null;

  const bins = 34;
  const lo = Math.min(...samples);
  const hi = Math.max(...samples);
  const width = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  samples.forEach((s) => {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((s - lo) / width)));
    counts[i] += 1;
  });
  const peak = Math.max(...counts);
  const at = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;

  return (
    <section className="djn-card djn-squircle djn-section" style={{ padding: "var(--s6)" }}>
      <SectionHead
        eyebrow="The spread"
        title="Every plausible answer at once"
        glossary="percentiles"
        explain={
          <>
            Each bar counts how many runs produced a break-even in that range. A tall narrow shape
            means the answer is robust; a wide flat one means it depends on what you assume. This is
            what reporting a range instead of a single figure actually looks like.
          </>
        }
        aside={<span className="djn-data-label">{samples.length} runs shown</span>}
      />

      <div style={{ position: "relative", paddingTop: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 132 }}>
          {counts.map((c, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.45, delay: i * 0.006, ease: [0.16, 1, 0.3, 1] }}
              style={{
                flex: 1,
                height: `${(c / peak) * 100}%`,
                minHeight: c > 0 ? 2 : 0,
                background: "var(--accent-graphic)",
                opacity: 0.2 + 0.8 * (c / peak),
                transformOrigin: "bottom",
                borderRadius: "2px 2px 0 0",
              }}
            />
          ))}
        </div>

        {[
          { v: p10, label: "P10" },
          { v: p50, label: "P50" },
          { v: p90, label: "P90" },
        ].map((m) => (
          <div
            key={m.label}
            style={{ position: "absolute", top: 18, bottom: 0, left: `${at(m.v)}%`, pointerEvents: "none" }}
          >
            <span style={{ display: "block", width: 1, height: "100%", background: "var(--text-primary)", opacity: 0.55 }} />
            <span
              className="djn-data-label"
              style={{ position: "absolute", top: -16, left: 3, color: "var(--text-secondary)", whiteSpace: "nowrap" }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between" style={{ marginTop: "var(--s3)" }}>
        <span className="djn-data-label">{fmt(lo)}</span>
        <span className="djn-data-label">break-even, {isUSD ? "US$" : code} per accelerator-hour</span>
        <span className="djn-data-label">{fmt(hi)}</span>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SITING
   ════════════════════════════════════════════════════════════════════ */

export function SiteTable({ data }: { data: ScenarioResponse }) {
  const { fmt } = useCurrency();
  const sites = data.lcoe.sites;
  const cheapest = sites[0];
  const lagos = sites.find((s) => s.key === "lagos");
  const premium =
    lagos && cheapest ? (lagos.lcoe_compute_usd_per_kwh / cheapest.lcoe_compute_usd_per_kwh - 1) * 100 : 0;

  return (
    <section id="siting" className="djn-card djn-squircle djn-section" style={{ padding: "var(--s6)" }}>
      <SectionHead
        eyebrow="Step four"
        title="Where it would actually be cheapest"
        glossary="computeGrade"
        /* Two different quantities appear in this section and they must never
           read as one: the busbar cost (leaving the generator) and the
           compute-grade cost (delivered to the chip, = busbar × PUE). */
        explain={
          <>
            The same generator at six Nigerian locations. Only two things change: how hard the
            climate makes the cooling work, and whether cheap <Term k="flareGas">flare gas</Term> is
            available. Everything else is held constant, so any difference in the ranking is siting
            alone.
          </>
        }
        aside={<ProvenanceChip kind="working" title="Site climate and flare distances are placeholders" />}
      />

      <div className="djn-scroll-x">
        <table className="djn-table">
          <thead>
            <tr>
              <th>Site</th>
              <th style={{ textAlign: "right" }}>
                <Unit k="PUEabbr" />
              </th>
              <th style={{ textAlign: "right" }}>
                Gas <Unit k="USDMMBtu">US$/MMBtu</Unit>
              </th>
              <th style={{ textAlign: "right" }}>
                <Unit k="centsKwh">US cents/kWh, at the chip</Unit>
              </th>
              <th style={{ textAlign: "right" }}>
                <Unit k="fuelShare">Fuel share</Unit>
              </th>
              <th>Gas access</th>
              <th style={{ textAlign: "right" }}>Flare km</th>
              <th>Fibre</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s, i) => (
              <tr key={s.key} data-best={i === 0}>
                <td style={{ fontWeight: 650, whiteSpace: "nowrap" }}>
                  {s.name}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> &middot; {s.state}</span>
                </td>
                <td className="tnum" style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {num(s.pue, 3)}
                </td>
                <td className="tnum" style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {num(s.gas_price_applied, 2)}
                </td>
                <td
                  className="tnum"
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 720,
                    color: i === 0 ? "var(--accent-text)" : "var(--text-primary)",
                  }}
                >
                  {num(s.lcoe_compute_us_cents_per_kwh, 2)}
                </td>
                <td className="tnum" style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                  {pct(s.fuel_share, 0)}
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{s.gas_access}</td>
                <td className="tnum" style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>
                  {num(s.flare_distance_km, 0)}
                </td>
                <td style={{ color: "var(--text-secondary)" }}>{s.fibre_quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="djn-note">
        <strong style={{ color: "var(--text-primary)" }}>The mismatch.</strong>{" "}
        {lagos && premium > 0 && (
          <>
            Lagos holds 21 of Nigeria&rsquo;s 28 data centres and is {num(premium, 0)} per cent
            dearer for compute-grade power than {cheapest.name}. The cheap power sits where the
            flare gas is, and the fibre does not.{" "}
          </>
        )}
        This model computes gas generation at {fmt(data.lcoe.busbar_usd_per_mwh)} per{" "}
        <Unit k="MWh" /> at the busbar — our own output, not a published figure. For scale,
        Uranbold and Lima (2025) report {money(data.lcoe.solar_battery_benchmark_usd_per_mwh)} for
        solar plus battery and $37.69 for natural gas; our gas figure sits above theirs mainly
        because of the Nigerian cost of capital and availability assumed here, both currently
        unsourced.
      </p>
    </section>
  );
}
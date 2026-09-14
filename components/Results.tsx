"use client";

import { motion } from "framer-motion";
import type { ScenarioResponse } from "@/lib/api";
import { money, num, pct } from "@/lib/api";
import { CountUp, ProvenanceChip } from "./Primitives";

/* ══════════════════════════════════════════════════════════════════
   NETBACK
   ══════════════════════════════════════════════════════════════════ */

/**
 * The four pathways on one scale.
 *
 * Bars are monochrome and the winner is distinguished by ink weight, not by
 * hue: colour-coding four categories would turn the chart into a rainbow and
 * break the discipline that makes the rest of the page read as one thing. The
 * gold whisker over each bar is the P10 to P90 range, and it is the only place
 * the accent appears in this component, because the uncertainty is the part
 * most readers would otherwise miss.
 */
export function NetbackChart({ data }: { data: ScenarioResponse }) {
  const max = Math.max(...data.netback.map((n) => Math.max(n.value, n.p90)));
  const min = Math.min(0, ...data.netback.map((n) => n.p10));
  const span = max - min || 1;
  const x = (v: number) => ((v - min) / span) * 100;

  return (
    <div className="djn-card djn-squircle" style={{ padding: "var(--s6)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="djn-eyebrow djn-eyebrow--accent">Netback</p>
          <h2 className="djn-title" style={{ fontSize: "var(--fs-h2)", marginTop: 4 }}>
            What one MMBtu earns down each path
          </h2>
        </div>
        <p className="djn-data-label">US dollars per MMBtu at the wellhead</p>
      </div>

      <div style={{ marginTop: "var(--s6)", display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        {data.netback.map((row, i) => {
          const isWinner = row.key === data.winner;
          return (
            <div key={row.key}>
              <div className="flex items-baseline justify-between gap-3" style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontWeight: isWinner ? 700 : 560,
                    color: isWinner ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {row.label}
                </span>
                <span
                  className="tnum"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-sm)",
                    fontWeight: 700,
                    color: isWinner ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {money(row.value)}
                </span>
              </div>

              <div className="djn-bar-track">
                <motion.div
                  className="djn-bar-fill"
                  data-winner={isWinner}
                  initial={false}
                  animate={{ width: `${Math.max(x(row.value) - x(0), 0)}%` }}
                  transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.04 }}
                  style={{ marginLeft: `${x(0)}%` }}
                />
                <span
                  className="djn-whisker"
                  aria-hidden="true"
                  style={{ left: `${x(row.p10)}%`, width: `${x(row.p90) - x(row.p10)}%` }}
                />
              </div>

              <p className="djn-data-label" style={{ marginTop: 5 }}>
                P10 {money(row.p10)} &middot; P50 {money(row.p50)} &middot; P90 {money(row.p90)}
              </p>
            </div>
          );
        })}
      </div>

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
        The gold bracket on each bar is the P10 to P90 range across {data.draws.toLocaleString()}{" "}
        Latin Hypercube draws. Regulated gas price for the power sector is {money(data.gas_price_power)} per
        MMBtu, so a pathway only clears if its netback sits above that line.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BREAK-EVEN
   ══════════════════════════════════════════════════════════════════ */

/**
 * The break-even, and the finding underneath it.
 *
 * The headline is not the break-even price itself but the gap between it and
 * the cash cost of running the accelerator, because that gap IS the value of
 * the gas. When it is small, gas pricing cannot steer siting, which is the
 * study's central policy result.
 */
export function BreakevenPanel({ data }: { data: ScenarioResponse }) {
  const b = data.breakeven;
  const gasShare = b.cash_cost > 0 ? b.gas_opportunity_cost / b.cash_cost : 0;

  return (
    <div className="djn-card djn-squircle" style={{ padding: "var(--s6)" }}>
      <p className="djn-eyebrow djn-eyebrow--accent">Break-even</p>
      <h2 className="djn-title" style={{ fontSize: "var(--fs-h2)", marginTop: 4 }}>
        Where compute stops winning
      </h2>

      <div style={{ marginTop: "var(--s6)", display: "flex", alignItems: "baseline", gap: "var(--s3)", flexWrap: "wrap" }}>
        <p className="djn-display" style={{ fontSize: "var(--fs-display-xl)" }}>
          <CountUp value={b.point} decimals={2} prefix="$" />
        </p>
        <p className="djn-data-label">per accelerator-hour</p>
      </div>

      <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", marginTop: "var(--s3)", maxWidth: "52ch" }}>
        Below this price, the gas earns more as {data.netback[1]?.label.toLowerCase() ?? "another use"}.
        Across the uncertainty the break-even runs {money(b.p10)} to {money(b.p90)}.
      </p>

      <div
        style={{
          marginTop: "var(--s6)",
          paddingTop: "var(--s5)",
          borderTop: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "var(--s5)",
        }}
      >
        <Metric label="Cash cost of the chip" value={b.cash_cost} dp={4} prefix="$" caption="Capital plus operating, per accelerator-hour" />
        <Metric label="Value of the gas" value={b.gas_opportunity_cost} dp={4} prefix="$" caption={`${pct(gasShare, 1)} of the cost of running the accelerator`} accent />
        <Metric label="Compute ranks first" value={data.compute_ranks_first_share * 100} dp={1} suffix="%" caption={`Of ${data.draws.toLocaleString()} draws`} />
      </div>

      {gasShare < 0.1 && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: "var(--s5)",
            padding: "var(--s4)",
            borderLeft: "2px solid var(--brand-accent)",
            background: "var(--bg-secondary)",
            fontSize: "var(--fs-sm)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            borderRadius: "0 var(--r-sm) var(--r-sm) 0",
          }}
        >
          The whole opportunity cost of the gas is {money(b.gas_opportunity_cost, 4)} per accelerator-hour,
          under {pct(gasShare, 0)} of what the machine costs to run. At this scale the gas price is not a
          lever: moving it across the regulated band barely moves a developer&rsquo;s decision. If Nigeria wants
          to shape where this load lands, licensing conditions and siting rules do the work that pricing cannot.
        </motion.p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  dp,
  prefix = "",
  suffix = "",
  caption,
  accent = false,
}: {
  label: string;
  value: number;
  dp: number;
  prefix?: string;
  suffix?: string;
  caption: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="djn-eyebrow" style={{ marginBottom: 8 }}>
        {label}
      </p>
      <p
        className="djn-display"
        style={{ fontSize: "1.4rem", color: accent ? "var(--accent-text)" : "var(--text-primary)" }}
      >
        <CountUp value={value} decimals={dp} prefix={prefix} suffix={suffix} />
      </p>
      <p style={{ fontSize: "var(--fs-micro)", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
        {caption}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DISTRIBUTION
   ══════════════════════════════════════════════════════════════════ */

/**
 * Histogram of the break-even across draws.
 *
 * Document 2 promises the study reports a spread rather than a single figure.
 * This is that promise made visible: the shape, not just the percentiles.
 */
export function Distribution({ samples, p10, p50, p90 }: { samples: number[]; p10: number; p50: number; p90: number }) {
  if (!samples?.length) return null;

  const bins = 34;
  const lo = Math.min(...samples);
  const hi = Math.max(...samples);
  const width = (hi - lo) / bins || 1;
  const counts = new Array(bins).fill(0);
  samples.forEach((s) => {
    const i = Math.min(bins - 1, Math.floor((s - lo) / width));
    counts[i] += 1;
  });
  const peak = Math.max(...counts);
  const at = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;

  return (
    <div className="djn-card djn-squircle" style={{ padding: "var(--s6)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="djn-eyebrow djn-eyebrow--accent">Distribution</p>
          <h2 className="djn-title" style={{ fontSize: "var(--fs-h2)", marginTop: 4 }}>
            Break-even across the uncertainty
          </h2>
        </div>
        <p className="djn-data-label">{samples.length} draws shown</p>
      </div>

      <div style={{ position: "relative", marginTop: "var(--s6)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 128 }}>
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
                background: "var(--text-primary)",
                opacity: 0.14 + 0.76 * (c / peak),
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
            style={{ position: "absolute", top: 0, bottom: 0, left: `${at(m.v)}%`, pointerEvents: "none" }}
          >
            <span style={{ display: "block", width: 1, height: "100%", background: "var(--brand-accent)", opacity: 0.7 }} />
            <span
              className="djn-data-label"
              style={{ position: "absolute", top: -16, left: 3, color: "var(--accent-text)", whiteSpace: "nowrap" }}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between" style={{ marginTop: "var(--s3)" }}>
        <span className="djn-data-label">{money(lo)}</span>
        <span className="djn-data-label">US$ per accelerator-hour</span>
        <span className="djn-data-label">{money(hi)}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SITES
   ══════════════════════════════════════════════════════════════════ */

/**
 * Objective 2, on screen: the cost of compute-grade power by site.
 *
 * The table is deliberately a table. Six sites compared on five attributes is
 * exactly what a hairline ledger does well, and a map would look impressive
 * while making the comparison harder to read.
 */
export function SiteTable({ data }: { data: ScenarioResponse }) {
  const sites = data.lcoe.sites;
  const cheapest = sites[0];
  const lagos = sites.find((s) => s.key === "lagos");
  const premium =
    lagos && cheapest
      ? (lagos.lcoe_compute_usd_per_kwh / cheapest.lcoe_compute_usd_per_kwh - 1) * 100
      : 0;

  return (
    <div className="djn-card djn-squircle" style={{ padding: "var(--s6)", overflow: "hidden" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2" style={{ marginBottom: "var(--s5)" }}>
        <div>
          <p className="djn-eyebrow djn-eyebrow--accent">Siting</p>
          <h2 className="djn-title" style={{ fontSize: "var(--fs-h2)", marginTop: 4 }}>
            Cost of compute-grade power by site
          </h2>
        </div>
        <ProvenanceChip kind="working" title="Site climate and flare distances are placeholders" />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="djn-table">
          <thead>
            <tr>
              <th>Site</th>
              <th style={{ textAlign: "right" }}>PUE</th>
              <th style={{ textAlign: "right" }}>Gas $/MMBtu</th>
              <th style={{ textAlign: "right" }}>US cents/kWh</th>
              <th style={{ textAlign: "right" }}>Fuel share</th>
              <th>Gas access</th>
              <th style={{ textAlign: "right" }}>Flare km</th>
              <th>Fibre</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.key}>
                <td style={{ fontWeight: 640 }}>
                  {s.name}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> &middot; {s.state}</span>
                </td>
                <td className="tnum" style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{num(s.pue, 3)}</td>
                <td className="tnum" style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{num(s.gas_price_applied, 2)}</td>
                <td className="tnum" style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
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
        {lagos && premium > 0 && (
          <>
            Lagos holds 21 of Nigeria&rsquo;s 28 facilities and is {num(premium, 0)} per cent dearer for
            compute-grade power than {cheapest.name}. The cheap power sits where the flare gas is and the
            fibre is not.{" "}
          </>
        )}
        Busbar gas comes to {money(data.lcoe.busbar_usd_per_mwh)} per MWh against{" "}
        {money(data.lcoe.solar_battery_benchmark_usd_per_mwh)} for solar plus battery (Uranbold and Lima,
        2025), which is the reliability premium that paper identifies.
      </p>
    </div>
  );
}
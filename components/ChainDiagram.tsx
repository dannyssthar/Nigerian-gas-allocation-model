"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { ScenarioResponse } from "@/lib/api";
import { num } from "@/lib/api";
import { CountUp } from "./Primitives";

/**
 * The gas-to-compute chain from Document 2, drawn.
 *
 * This exists because a reader trusts a number they can watch being built. The
 * four stages are the same four conversions the document sets out in prose, so
 * the screen and the document can never drift apart, and an examiner can check
 * one against the other in a few seconds.
 *
 * The connecting flow is animated once on mount with GSAP, not on every value
 * change. Motion that fires on each recompute would compete with the numbers
 * for attention; the numbers are what changed, so they count up and the
 * scaffolding stays still. One orchestrated moment, not scattered effects.
 */
export default function ChainDiagram({ data }: { data: ScenarioResponse }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.from(".djn-stage", {
        opacity: 0,
        y: 14,
        duration: 0.6,
        stagger: 0.09,
        ease: "power3.out",
      });
      gsap.from(".djn-flow", {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.5,
        stagger: 0.09,
        delay: 0.16,
        ease: "power2.inOut",
      });
    }, el);

    return () => ctx.revert();
  }, []);

  const c = data.chain;
  const stages = [
    {
      label: "Gas",
      value: 1,
      dp: 2,
      unit: "MMBtu",
      caption: "One unit of Nigerian natural gas",
    },
    {
      label: "Electricity",
      value: c.electricity_kwh,
      dp: 2,
      unit: "kWh",
      caption: "Combined-cycle turbine at the stated heat rate",
    },
    {
      label: "Compute-grade",
      value: c.compute_grade_kwh,
      dp: 2,
      unit: "kWh",
      caption: `${num(c.overhead_kwh, 2)} kWh goes to cooling and overhead`,
    },
    {
      label: "Compute",
      value: c.accelerator_hours,
      dp: 2,
      unit: "accelerator-hours",
      caption: `At ${num(c.draw_kwh_per_accelerator_hour, 2)} kWh per accelerator-hour`,
    },
  ];

  return (
    <div ref={root} className="djn-card djn-squircle" style={{ padding: "var(--s6)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2" style={{ marginBottom: "var(--s6)" }}>
        <div>
          <p className="djn-eyebrow djn-eyebrow--accent">The conversion</p>
          <h2 className="djn-title" style={{ fontSize: "var(--fs-h2)", marginTop: 4 }}>
            What one MMBtu of gas becomes
          </h2>
        </div>
        <p className="djn-data-label">Document 2 &middot; section 2</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: "var(--s4)",
        }}
      >
        {stages.map((s, i) => (
          <div key={s.label} className="djn-stage" style={{ position: "relative" }}>
            {i > 0 && (
              <span
                className="djn-flow"
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "calc(var(--s4) * -1)",
                  top: 26,
                  width: "var(--s4)",
                  height: 1,
                  background: "var(--line-strong)",
                }}
              />
            )}
            <p className="djn-eyebrow" style={{ marginBottom: 6 }}>
              {s.label}
            </p>
            <p
              className="djn-display"
              style={{
                fontSize: "1.75rem",
                color: i === 3 ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <CountUp value={s.value} decimals={s.dp} />
            </p>
            <p className="djn-data-label" style={{ marginTop: 2 }}>
              {s.unit}
            </p>
            <p
              style={{
                fontSize: "var(--fs-micro)",
                color: "var(--text-muted)",
                marginTop: "var(--s3)",
                lineHeight: 1.5,
              }}
            >
              {s.caption}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
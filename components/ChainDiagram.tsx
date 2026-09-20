"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import type { ScenarioResponse } from "@/lib/api";
import { num } from "@/lib/api";
import { CountUp, SectionHead } from "./Primitives";
import { Info, Unit } from "./Tooltip";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * The conversion chain, from Document 2.
 *
 * A reader trusts a number they can watch being built. These are the same four
 * conversions the document sets out in prose, so the screen and the document
 * can be checked against each other in seconds.
 *
 * The connectors draw themselves once, on scroll, using stroke-dashoffset.
 * Animating the flow rather than fading in the boxes makes the direction of
 * the process legible without a single arrowhead needing explanation.
 */
export default function ChainDiagram({ data }: { data: ScenarioResponse }) {
  const root = useRef<HTMLDivElement>(null);
  const c = data.chain;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 78%", once: true },
      });
      tl.from(".djn-stage", { opacity: 0, y: 16, duration: 0.6, stagger: 0.12, ease: "power3.out" });
    }, el);

    return () => ctx.revert();
  }, []);

  const stages = [
    {
      label: "Gas in",
      value: 1,
      dp: 2,
      unit: <Unit k="MMBtu" />,
      caption: "One unit of Nigerian natural gas, the thing being allocated.",
    },
    {
      label: "Electricity",
      value: c.electricity_kwh,
      dp: 2,
      unit: <Unit k="kWh" />,
      caption: "Burned in a combined-cycle turbine. A better turbine yields more from the same gas.",
    },
    {
      label: "Reaches the chips",
      value: c.compute_grade_kwh,
      dp: 2,
      unit: <Unit k="kWh" />,
      caption: `${num(c.overhead_kwh, 2)} kWh never gets there: it runs cooling, power conversion and lighting.`,
    },
    {
      label: "Compute bought",
      value: c.accelerator_hours,
      dp: 2,
      unit: <Unit k="acceleratorHour">accelerator-hours</Unit>,
      caption: `Each accelerator-hour draws ${num(c.draw_kwh_per_accelerator_hour, 2)} kWh at the current settings.`,
      final: true,
    },
  ];

  return (
    <section
      ref={root}
      id="conversion"
      className="djn-card djn-squircle djn-section"
      data-tour="chain"
      style={{ padding: "var(--s6)" }}
    >
      <SectionHead
        eyebrow="Step one"
        title="What one unit of gas becomes"
        explain={
          <>
            Before any money is involved, the physics. Gas burns to make electricity, some of that
            electricity runs cooling rather than chips, and whatever reaches the chips buys{" "}
            <Unit k="acceleratorHour">accelerator-hours</Unit>. This is the conversion everything
            else on the page rests on.
          </>
        }
        aside={<span className="djn-data-label">Document 2 &middot; section 2</span>}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))",
          gap: "var(--s5)",
          alignItems: "start",
        }}
      >
        {stages.map((s, i) => (
          <div key={s.label} className="djn-stage" style={{ position: "relative", minWidth: 0 }}>

            <p className="djn-eyebrow" style={{ marginBottom: 8 }}>
              {s.label}
            </p>
            <p
              className="djn-display"
              style={{
                fontSize: "1.7rem",
                color: s.final ? "var(--accent-text)" : "var(--text-primary)",
              }}
            >
              <CountUp value={s.value} decimals={s.dp} />
            </p>
            <p className="djn-data-label" style={{ marginTop: 4 }}>
              {s.unit}
            </p>
            <p
              style={{
                fontSize: "var(--fs-micro)",
                color: "var(--text-muted)",
                marginTop: "var(--s3)",
                lineHeight: 1.6,
              }}
            >
              {s.caption}
            </p>
          </div>
        ))}
      </div>

      <p className="djn-note">
        Move <strong style={{ color: "var(--text-primary)" }}>turbine heat rate</strong> or{" "}
        <Unit k="PUEabbr" /> in the panel of assumptions and watch this chain change. A hotter site
        needs more cooling, which lifts <Unit k="PUEabbr" /> and leaves less electricity for the
        chips.
        <Info k="pue" />
      </p>
    </section>
  );
}
"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import GridStars from "./GridStars";
import { Term } from "./Tooltip";

/**
 * The hero.
 *
 * A tool that opens straight onto forty numbers loses the reader in the first
 * two seconds. This gives them the question first, in one sentence, and the
 * stakes in three figures, before any control appears. It is the difference
 * between a dashboard and a piece of work someone chooses to read.
 *
 * One orchestrated entrance, on load, and then the page is still. Each
 * headline line sits in an overflow-hidden mask and slides up from under it,
 * which reads as type being set rather than elements fading in.
 */
export default function Hero({ onStart }: { onStart: () => void }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".djn-hero__eyebrow", { opacity: 0, y: 10, duration: 0.5 })
        .from(
          ".djn-hero__line > span",
          { yPercent: 118, duration: 0.95, stagger: 0.085, ease: "power4.out" },
          "-=0.25"
        )
        .from(".djn-hero__lede", { opacity: 0, y: 14, duration: 0.7 }, "-=0.55")
        .from(
          ".djn-hero__stat",
          { opacity: 0, y: 18, duration: 0.6, stagger: 0.1 },
          "-=0.4"
        )
        .from(".djn-hero__cta", { opacity: 0, y: 12, duration: 0.55 }, "-=0.35")
        .from(".djn-hero__cue", { opacity: 0, duration: 0.6 }, "-=0.2");

      // the cue keeps breathing after the entrance, as a standing invitation
      gsap.to(".djn-hero__cue-dot", {
        y: 7,
        repeat: -1,
        yoyo: true,
        duration: 1.1,
        ease: "sine.inOut",
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="djn-hero" id="top">
      <div className="djn-hero__grid" aria-hidden="true" />
      <GridStars />

      <div style={{ maxWidth: 1080, marginInline: "auto", width: "100%", position: "relative" }}>
        <p className="djn-eyebrow djn-eyebrow--accent djn-hero__eyebrow">
          NGAM &middot; Nigeria Gas Allocation Model
        </p>

        <h1
          className="djn-display"
          style={{ fontSize: "var(--fs-hero)", marginTop: "var(--s5)", maxWidth: "16ch" }}
        >
          <span className="djn-hero__line">
            <span>Powering compute</span>
          </span>
          <span className="djn-hero__line">
            <span>or powering</span>
          </span>
          <span className="djn-hero__line">
            <span style={{ color: "var(--accent-text)" }}>the nation?</span>
          </span>
        </h1>

        <p
          className="djn-hero__lede djn-measure"
          style={{
            fontSize: "var(--fs-lead)",
            color: "var(--text-secondary)",
            marginTop: "var(--s6)",
            lineHeight: 1.7,
          }}
        >
          One unit of Nigerian gas can be exported as LNG, turned into fertiliser, burned for the
          grid, or used to run AI accelerators. Each pays differently, and each leaves the country
          somewhere different. This model puts all four on{" "}
          <Term k="netback">one measure</Term> and works out which wins, at what price, and where.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: "var(--s6)",
            marginTop: "var(--s12)",
            maxWidth: 720,
          }}
        >
          <Stat value="170.07" unit="accelerator-hours" caption="from one MMBtu of gas" />
          <Stat value="4" unit="competing uses" caption="valued on a single boundary" />
          <Stat value="6" unit="US cents" caption="what the gas is worth per chip-hour" accent />
        </div>

        <div
          className="djn-hero__cta"
          style={{ display: "flex", gap: "var(--s3)", marginTop: "var(--s10)", flexWrap: "wrap" }}
        >
          <button className="djn-btn djn-btn--accent" onClick={onStart} style={{ padding: "13px 26px" }}>
            Take the walkthrough
          </button>
          <a href="#overview" className="djn-btn" style={{ padding: "13px 26px" }}>
            Go straight to the model
          </a>
        </div>

        <div
          className="djn-hero__cue"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--s3)",
            marginTop: "var(--s16)",
          }}
        >
          <span className="djn-hero__cue-dot" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 4v15m0 0-5.5-5.5M12 19l5.5-5.5"
                stroke="var(--accent-text)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="djn-data-label">Scroll to run the model</span>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  unit,
  caption,
  accent = false,
}: {
  value: string;
  unit: string;
  caption: string;
  accent?: boolean;
}) {
  return (
    <div className="djn-hero__stat">
      <p
        className="djn-display tnum"
        style={{ fontSize: "2rem", color: accent ? "var(--accent-text)" : "var(--text-primary)" }}
      >
        {value}
      </p>
      <p className="djn-data-label" style={{ marginTop: 4 }}>
        {unit}
      </p>
      <p
        style={{
          fontSize: "var(--fs-micro)",
          color: "var(--text-muted)",
          marginTop: 6,
          lineHeight: 1.5,
        }}
      >
        {caption}
      </p>
    </div>
  );
}
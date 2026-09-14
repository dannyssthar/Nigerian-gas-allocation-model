"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import type { ProvenanceKind } from "@/lib/api";
import type { GLOSSARY } from "@/lib/glossary";
import { Info } from "./Tooltip";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/* ── numbers ─────────────────────────────────────────────────────── */

/**
 * A number that counts to its new value rather than jumping.
 *
 * GSAP rather than Framer Motion, because this is a value tween on a text node
 * and GSAP's ticker runs a dozen of them at once without React re-rendering on
 * every frame. Keeps tabular figures, so digits do not shift width mid-count.
 */
export function CountUp({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  duration = 0.6,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
      current.current = value;
      el.textContent = prefix + fmt(value, decimals) + suffix;
      return;
    }

    const obj = { v: current.current };
    const tween = gsap.to(obj, {
      v: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = prefix + fmt(obj.v, decimals) + suffix;
      },
      onComplete: () => {
        current.current = value;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, decimals, prefix, suffix, duration]);

  return (
    <span ref={ref} className={`tnum ${className}`}>
      {prefix + fmt(value, decimals) + suffix}
    </span>
  );
}

function fmt(v: number, dp: number) {
  const sign = v < 0 ? "\u2212" : "";
  return (
    sign +
    Math.abs(v).toLocaleString("en-US", {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    })
  );
}

/* ── provenance ──────────────────────────────────────────────────── */

const PROV_WORD: Record<ProvenanceKind, string> = {
  sourced: "Sourced",
  derived: "Derived",
  working: "Unsourced",
  user: "Yours",
};

/**
 * The most important small component here.
 *
 * A stakeholder will disagree with a placeholder within seconds of opening the
 * tool. If the chip is present, that disagreement turns into engagement; if it
 * is absent, discovering a hidden placeholder costs the reader's trust in
 * everything else on the page. The word is always rendered, so meaning never
 * rests on colour alone.
 */
export function ProvenanceChip({
  kind,
  title,
  ...rest
}: {
  kind: ProvenanceKind;
  title?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="djn-chip" data-prov={kind} title={title} {...rest}>
      {PROV_WORD[kind]}
    </span>
  );
}

/* ── section furniture ───────────────────────────────────────────── */

/**
 * Every section gets a heading, an optional glossary link, and a line of plain
 * English explaining what the reader is looking at. That explainer line is not
 * decoration: it is the difference between a chart and a chart someone
 * understands.
 */
export function SectionHead({
  eyebrow,
  title,
  explain,
  glossary,
  aside,
}: {
  eyebrow: string;
  title: string;
  explain?: React.ReactNode;
  glossary?: keyof typeof GLOSSARY;
  aside?: React.ReactNode;
}) {
  return (
    <div className="djn-section__head">
      <div style={{ flex: "1 1 420px", minWidth: 0 }}>
        <p className="djn-eyebrow djn-eyebrow--accent">{eyebrow}</p>
        <h2
          className="djn-title"
          style={{ fontSize: "var(--fs-h2)", marginTop: 5, display: "flex", alignItems: "center" }}
        >
          {title}
          {glossary && <Info k={glossary} />}
        </h2>
        {explain && (
          <p className="djn-explain" style={{ marginTop: "var(--s3)" }}>
            {explain}
          </p>
        )}
      </div>
      {aside && <div style={{ flexShrink: 0 }}>{aside}</div>}
    </div>
  );
}

/**
 * Scroll reveal.
 *
 * Deliberately understated: 18px and a fade, once, never replayed. Sections
 * that slide in dramatically on every scroll are the clearest tell of a
 * template. This exists so the page feels alive on the way down, not so it
 * performs.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  delay?: number;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return;

    const tween = gsap.fromTo(
      el,
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        delay,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay]);

  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  );
}

/* ── loading ─────────────────────────────────────────────────────── */

/** Shown while the first model run is in flight. Shaped like the content it
 *  replaces, so the layout does not jump when the data lands. */
export function Skeleton({ height = 160 }: { height?: number }) {
  return (
    <div
      className="djn-card djn-squircle"
      style={{
        height,
        background:
          "linear-gradient(90deg,var(--bg-secondary),var(--bg-tertiary),var(--bg-secondary))",
        backgroundSize: "200% 100%",
        animation: "djn-shimmer 1.6s linear infinite",
      }}
      aria-hidden="true"
    >
      <style>{`@keyframes djn-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}
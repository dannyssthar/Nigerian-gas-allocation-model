"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { ProvenanceKind } from "@/lib/api";

/**
 * A number that counts to its new value instead of jumping.
 *
 * GSAP rather than Framer Motion here because this is a value tween on a text
 * node, not component choreography, and GSAP's ticker handles a dozen of these
 * running at once without React re-rendering on every frame. One library per
 * job: Framer Motion does the layout and presence work elsewhere.
 *
 * The element keeps `tabular-nums`, so the digits do not shift width mid-count.
 */
export function CountUp({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  duration = 0.55,
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

const PROV_WORD: Record<ProvenanceKind, string> = {
  sourced: "Sourced",
  derived: "Derived",
  working: "Unsourced",
  user: "Yours",
};

/**
 * Provenance chip.
 *
 * This is the most important small component in the interface. An expert will
 * disagree with a placeholder within seconds of opening the tool; if the chip
 * is there, that disagreement becomes engagement, and if it is not, they stop
 * trusting everything else on screen. The word is always present, so the
 * meaning never rests on colour alone.
 */
export function ProvenanceChip({
  kind,
  title,
}: {
  kind: ProvenanceKind;
  title?: string;
}) {
  return (
    <span className="djn-chip" data-prov={kind} title={title}>
      {PROV_WORD[kind]}
    </span>
  );
}
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

/**
 * The walkthrough.
 *
 * A quantitative tool is intimidating on first contact: a stranger sees forty
 * numbers and no way in. This walks them through it in eight steps, one click
 * at a time, spotlighting the element being described so there is never any
 * doubt about what is being pointed at.
 *
 * The spotlight is a box-shadow trick rather than an SVG mask: a transparent
 * div sits over the target with a 9999px shadow, which darkens everything
 * except the hole. It costs one element, works in every browser, and cannot
 * desynchronise from the target the way two stacked layers can.
 *
 * Runs automatically on a first visit, and can be replayed from the nav.
 */

export interface Step {
  selector: string;
  title: string;
  body: string;
  /** Where to put the card relative to the spotlight. Auto-flips if there is no room. */
  prefer?: "top" | "bottom" | "right" | "left";
}

export const TOUR: Step[] = [
  {
    selector: "[data-tour='verdict']",
    title: "Start with the answer",
    body:
      "This is what one MMBtu of Nigerian gas earns down its best-paying route, and which route that is. Everything below this card is the working that produced it.",
    prefer: "bottom",
  },
  {
    selector: "[data-tour='chain']",
    title: "How gas becomes compute",
    body:
      "Gas burns to make electricity, some of that electricity runs cooling rather than chips, and what reaches the chips buys accelerator-hours. Four steps, no black box.",
    prefer: "bottom",
  },
  {
    selector: "[data-tour='netback']",
    title: "The four competing uses",
    body:
      "The same gas could be exported as LNG, made into fertiliser, or burned for the grid. These bars put all four on one scale so the comparison is arithmetic rather than argument.",
    prefer: "top",
  },
  {
    selector: "[data-tour='whisker']",
    title: "Nothing here is a single number",
    body:
      "The bracket over each bar is the range across thousands of runs. A wide bracket means the result depends heavily on assumptions. Honest models show their spread.",
    prefer: "top",
  },
  {
    selector: "[data-tour='breakeven']",
    title: "Where the answer flips",
    body:
      "Below this price per accelerator-hour, the gas is worth more as something else. The gap between it and the cost of running the chip is what the gas itself is actually worth.",
    prefer: "top",
  },
  {
    selector: "[data-tour='rail']",
    title: "Change anything you disagree with",
    body:
      "Every assumption is a slider. Move one and the whole model recomputes in under a third of a second. This is the point of the tool: bring your own numbers.",
    prefer: "right",
  },
  {
    selector: "[data-tour='chip']",
    title: "Every number says where it came from",
    body:
      "Green means sourced and citable. Lime means a working placeholder that is not yet evidence. If a figure is not backed by a source, the tool tells you rather than waiting to be caught.",
    prefer: "right",
  },
  {
    selector: "[data-tour='nav']",
    title: "You are set",
    body:
      "Use the nav to jump between sections, and the circled 'i' beside any term for a plain-English definition. Replay this walkthrough any time from the guide button.",
    prefer: "bottom",
  },
];

const SEEN_KEY = "djn-tour-seen";

export function useWalkthrough() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        // let the hero animation land first
        const t = setTimeout(() => setActive(true), 1400);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked; simply do not auto-run */
    }
  }, []);

  const start = useCallback(() => setActive(true), []);
  const stop = useCallback(() => {
    setActive(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* no-op */
    }
  }, []);

  return { active, start, stop };
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function Walkthrough({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const step = TOUR[i];

  const locate = useCallback(() => {
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 8;
    setBox({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [step.selector]);

  // Scroll the target into view, wait for smooth scrolling to settle, then
  // measure. Measuring immediately would spotlight the old position.
  useEffect(() => {
    const el = document.querySelector(step.selector) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(locate, 460);
    window.addEventListener("resize", locate);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", locate);
    };
  }, [step.selector, locate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, TOUR.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const last = i === TOUR.length - 1;
  const card = cardPosition(box, step.prefer);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
      {/* spotlight, or a plain scrim when the target is missing */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        style={
          box
            ? {
                position: "fixed",
                top: box.top,
                left: box.left,
                width: box.width,
                height: box.height,
                borderRadius: 14,
                boxShadow: "0 0 0 9999px var(--scrim)",
                border: "1.5px solid var(--accent-graphic)",
                transition: "all .42s cubic-bezier(.16,1,.3,1)",
                pointerEvents: "none",
              }
            : { position: "fixed", inset: 0, background: "var(--scrim)" }
        }
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="djn-card djn-squircle"
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          style={{
            position: "fixed",
            ...card,
            width: "min(360px, calc(100vw - 32px))",
            padding: "var(--s6)",
            background: "var(--surface)",
            boxShadow: "var(--e3)",
            borderColor: "var(--line-strong)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--s3)" }}>
            <span className="djn-data-label" style={{ color: "var(--accent-text)" }}>
              Step {i + 1} of {TOUR.length}
            </span>
            <button
              onClick={onClose}
              className="djn-data-label"
              style={{ cursor: "pointer" }}
              aria-label="Skip the walkthrough"
            >
              Skip
            </button>
          </div>

          <h3 className="djn-title" style={{ fontSize: "1.1rem" }}>
            {step.title}
          </h3>
          <p
            style={{
              fontSize: "var(--fs-sm)",
              color: "var(--text-secondary)",
              lineHeight: 1.65,
              marginTop: "var(--s3)",
            }}
          >
            {step.body}
          </p>

          {/* progress ticks, so the end is always in sight */}
          <div style={{ display: "flex", gap: 4, marginTop: "var(--s5)" }}>
            {TOUR.map((_, n) => (
              <button
                key={n}
                onClick={() => setI(n)}
                aria-label={`Go to step ${n + 1}`}
                style={{
                  height: 3,
                  flex: 1,
                  borderRadius: 99,
                  background: n <= i ? "var(--accent-graphic)" : "var(--line-strong)",
                  transition: "background .3s",
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: "var(--s2)", marginTop: "var(--s5)" }}>
            {i > 0 && (
              <button className="djn-btn djn-btn--ghost" onClick={() => setI(i - 1)}>
                Back
              </button>
            )}
            <button
              className="djn-btn djn-btn--accent"
              style={{ flex: 1 }}
              onClick={() => (last ? onClose() : setI(i + 1))}
            >
              {last ? "Start exploring" : "Next"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Place the card beside the spotlight, flipping when there is no room. */
function cardPosition(box: Box | null, prefer: Step["prefer"] = "bottom") {
  const W = typeof window !== "undefined" ? window.innerWidth : 1200;
  const H = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardW = Math.min(360, W - 32);
  const cardH = 260;

  if (!box || W < 760) {
    // On phones the card always sits at the bottom: beside-the-target
    // placement leaves no room for either, and a jumping card is worse than a
    // predictable one.
    return { left: "50%", bottom: 20, transform: "translateX(-50%)" } as const;
  }

  const gap = 16;
  const clampX = (x: number) => Math.min(Math.max(x, 16), W - cardW - 16);
  const clampY = (y: number) => Math.min(Math.max(y, 16), H - cardH - 16);

  if (prefer === "right" && box.left + box.width + gap + cardW < W) {
    return { left: box.left + box.width + gap, top: clampY(box.top) } as const;
  }
  if (prefer === "left" && box.left - gap - cardW > 0) {
    return { left: box.left - gap - cardW, top: clampY(box.top) } as const;
  }
  if (prefer === "top" && box.top - gap - cardH > 0) {
    return {
      left: clampX(box.left + box.width / 2 - cardW / 2),
      top: box.top - gap - cardH,
    } as const;
  }
  if (box.top + box.height + gap + cardH < H) {
    return {
      left: clampX(box.left + box.width / 2 - cardW / 2),
      top: box.top + box.height + gap,
    } as const;
  }
  return { left: "50%", bottom: 20, transform: "translateX(-50%)" } as const;
}
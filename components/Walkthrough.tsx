"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The walkthrough.
 *
 * A quantitative tool is intimidating on first contact: a stranger sees forty
 * numbers and no way in. This walks them through in eight steps, spotlighting
 * the element being described so there is never doubt about what is meant.
 *
 * Two things govern how it is built.
 *
 * Transform belongs to the animation, not to layout. The previous version
 * centred the card with translateX(-50%) while Framer Motion wrote its own
 * transform for the entrance, and the later write silently destroyed the
 * centring, which is why the card ran off the side of a phone. Position is now
 * expressed purely in left / right / top / bottom, and transform is left
 * entirely to motion.
 *
 * One card that travels, not a card that dies and is reborn. The shell springs
 * between positions while only its contents cross-fade. That single decision
 * is most of the difference between a tour that feels assembled and one that
 * feels designed.
 */

export interface Step {
  selector: string;
  title: string;
  body: string;
  prefer?: "top" | "bottom" | "right" | "left";
}

export const TOUR: Step[] = [
  {
    selector: "[data-tour='verdict']",
    title: "Start with the answer",
    body:
      "This is what one unit of Nigerian gas earns down its best-paying route, and which route that is. Everything below this card is the working that produced it.",
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
      "The same gas could be exported as LNG, made into fertiliser, or burned for the grid. These bars put all four on one scale, so the comparison is arithmetic rather than argument.",
    prefer: "top",
  },
  {
    selector: "[data-tour='whisker']",
    title: "Nothing here is a single number",
    body:
      "The bracket over each bar is the range across thousands of runs. A wide bracket means the result leans heavily on assumptions. Honest models show their spread.",
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
      "Green means sourced and citable. Lime means a working placeholder that is not yet evidence. If a figure is not backed by a source, the tool says so rather than waiting to be caught.",
    prefer: "right",
  },
  {
    selector: "[data-tour='nav']",
    title: "You are set",
    body:
      "Use the navigation to jump between sections, and the circled i beside any term for a definition you can select and copy. Replay this any time from the guide button.",
    prefer: "bottom",
  },
];

const SEEN_KEY = "djn-tour-seen";
const CARD_W = 372;
const GAP = 18;

export function useWalkthrough() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        const t = setTimeout(() => setActive(true), 1500);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked in sandboxed frames; simply do not auto-run */
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
  const [mounted, setMounted] = useState(false);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [vw, setVw] = useState(1200);
  const [vh, setVh] = useState(800);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(250);

  useEffect(() => setMounted(true), []);

  /* A step whose target does not exist would spotlight nothing and waste a
     click. On a phone the assumptions rail lives inside a closed sheet, so two
     steps legitimately have no target and are dropped rather than shown
     empty. */
  const steps = useMemo(() => {
    if (!mounted) return TOUR;
    return TOUR.filter((s) => document.querySelector(s.selector));
  }, [mounted]);

  const step = steps[Math.min(i, steps.length - 1)];
  const isPhone = vw < 760;

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Measure the card so placement uses its real height rather than a guess.
  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [i, vw]);

  const locate = useCallback(() => {
    const el = document.querySelector(step?.selector ?? "") as HTMLElement | null;
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    const pad = 10;
    setBox({
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [step?.selector]);

  /* Scroll the target into the space the card will NOT occupy. On a phone the
     card sits along the bottom, so centring the target would hide it behind
     the card; it is placed a third of the way down instead. */
  useEffect(() => {
    const el = document.querySelector(step?.selector ?? "") as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      const targetY = isPhone ? window.innerHeight * 0.3 : window.innerHeight * 0.45;
      const to = window.scrollY + r.top - targetY + r.height / 2;
      window.scrollTo({ top: Math.max(0, to), behavior: "smooth" });
    }
    const t = setTimeout(locate, 480);
    const t2 = setTimeout(locate, 900); // catch slow smooth-scroll settling
    window.addEventListener("resize", locate);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener("resize", locate);
    };
  }, [step?.selector, locate, isPhone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "Enter")
        setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, steps.length]);

  if (!mounted || !step) return null;

  const last = i === steps.length - 1;
  const place = position(box, step.prefer, vw, vh, cardH, isPhone);

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 300 }} role="dialog" aria-modal="true">
      <Spotlight box={box} onClose={onClose} />

      <motion.div
        ref={cardRef}
        /* Position lives in left / right / top / bottom ONLY. Transform is
           reserved for motion, which is what stopped the card escaping the
           viewport on narrow screens. */
        initial={false}
        animate={place}
        transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
        className="djn-tour-card"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="djn-tour-card__top">
            <span className="djn-data-label" style={{ color: "var(--accent-text)" }}>
              {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
            </span>
            <button onClick={onClose} className="djn-tour-skip" aria-label="Skip the walkthrough">
              Skip
            </button>
          </div>

          {/* Only the words change between steps, so only the words fade. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3 className="djn-title" style={{ fontSize: "1.15rem" }}>
                {step.title}
              </h3>
              <p className="djn-tour-body">{step.body}</p>
            </motion.div>
          </AnimatePresence>

          {/* One continuous rail that fills, rather than eight separate ticks
              redrawing. Reads as progress instead of bookkeeping. */}
          <div className="djn-tour-rail" aria-hidden="true">
            <motion.span
              animate={{ width: `${((i + 1) / steps.length) * 100}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 28 }}
            />
          </div>

          <div className="djn-tour-actions">
            <AnimatePresence initial={false}>
              {i > 0 && (
                <motion.button
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="djn-btn djn-btn--ghost"
                  onClick={() => setI(i - 1)}
                  style={{ overflow: "hidden", whiteSpace: "nowrap" }}
                >
                  Back
                </motion.button>
              )}
            </AnimatePresence>
            <button
              className="djn-btn djn-btn--accent"
              style={{ flex: 1 }}
              onClick={() => (last ? onClose() : setI(i + 1))}
            >
              {last ? "Start exploring" : "Next"}
              {!last && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h13m0 0-5-5m5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>,
    document.body
  );
}

/**
 * The spotlight.
 *
 * The first version sprang width and height, which forces the layout engine to
 * run on every frame, while repainting a nine-thousand-pixel box-shadow. That
 * combination is exactly what animation jank is made of.
 *
 * Now the darkening is one full-screen scrim whose HOLE is cut by a clip-path.
 * Updating a clip-path is paint work only, never layout, and painting a flat
 * translucent rectangle is what browsers do while scrolling, so it is already
 * fast everywhere. The hole is a rounded rectangle wound counter-clockwise
 * inside a huge clockwise outer rectangle, which the non-zero fill rule reads
 * as a cut-out, with no reliance on newer fill-rule syntax.
 *
 * The lime ring is its own element with `contain: strict`, so the layout its
 * resize triggers is scoped to the ring itself rather than the document.
 */
function Spotlight({ box, onClose }: { box: Box | null; onClose: () => void }) {
  const cfg = { stiffness: 230, damping: 30, mass: 0.85 };
  const xv = useMotionValue(0);
  const yv = useMotionValue(0);
  const wv = useMotionValue(0);
  const hv = useMotionValue(0);
  const x = useSpring(xv, cfg);
  const y = useSpring(yv, cfg);
  const w = useSpring(wv, cfg);
  const h = useSpring(hv, cfg);
  const [seen, setSeen] = useState(false);

  const clip = useTransform([x, y, w, h], (v) => {
    const [cx, cy, cw, ch] = v as number[];
    return holePath(cx, cy, Math.max(cw, 1), Math.max(ch, 1), 18);
  });

  useEffect(() => {
    if (!box) return;
    if (!seen) {
      // first appearance lands in place; springing in from the origin on the
      // opening step reads as a glitch, not an entrance
      xv.jump(box.left);
      yv.jump(box.top);
      wv.jump(box.width);
      hv.jump(box.height);
      setSeen(true);
    }
    xv.set(box.left);
    yv.set(box.top);
    wv.set(box.width);
    hv.set(box.height);
  }, [box, seen, xv, yv, wv, hv]);

  if (!box) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "var(--scrim)" }}
      />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--scrim)",
          clipPath: clip,
          WebkitClipPath: clip,
        }}
      />
      <motion.div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          x,
          y,
          width: w,
          height: h,
          contain: "strict",
          borderRadius: 18,
          border: "1.5px solid var(--accent-graphic)",
          boxShadow: "var(--accent-glow)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/**
 * A screen-sized rectangle with a rounded cut-out.
 *
 * Outer rectangle clockwise, inner counter-clockwise: under the default
 * non-zero winding rule the reversed inner loop subtracts, leaving a hole.
 * The outer rectangle is a fixed 100,000px, which outsizes any viewport and
 * saves reading window dimensions on every frame.
 */
function holePath(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  return `path("M0 0H100000V100000H0Z \
M${x + rr} ${y} \
A${rr} ${rr} 0 0 0 ${x} ${y + rr} \
V${y + h - rr} \
A${rr} ${rr} 0 0 0 ${x + rr} ${y + h} \
H${x + w - rr} \
A${rr} ${rr} 0 0 0 ${x + w} ${y + h - rr} \
V${y + rr} \
A${rr} ${rr} 0 0 0 ${x + w - rr} ${y} \
Z")`;
}

/**
 * Where the card goes.
 *
 * Returns only left / right / top / bottom, never transform. On a phone it is
 * always a bottom sheet pinned 16px from each side: beside-the-target
 * placement leaves room for neither, and a card that jumps around a small
 * screen is worse than one that stays put.
 */
function position(
  box: Box | null,
  prefer: Step["prefer"] = "bottom",
  vw: number,
  vh: number,
  cardH: number,
  isPhone: boolean
) {
  if (isPhone || !box) {
    return { left: 16, right: 16, bottom: 18, top: "auto" as const };
  }

  const clampX = (x: number) => Math.min(Math.max(x, 16), vw - CARD_W - 16);
  const clampY = (y: number) => Math.min(Math.max(y, 16), vh - cardH - 16);
  const centred = clampX(box.left + box.width / 2 - CARD_W / 2);

  const fitsRight = box.left + box.width + GAP + CARD_W < vw;
  const fitsLeft = box.left - GAP - CARD_W > 0;
  const fitsAbove = box.top - GAP - cardH > 0;
  const fitsBelow = box.top + box.height + GAP + cardH < vh;

  if (prefer === "right" && fitsRight)
    return { left: box.left + box.width + GAP, top: clampY(box.top), right: "auto" as const, bottom: "auto" as const };
  if (prefer === "left" && fitsLeft)
    return { left: box.left - GAP - CARD_W, top: clampY(box.top), right: "auto" as const, bottom: "auto" as const };
  if (prefer === "top" && fitsAbove)
    return { left: centred, top: box.top - GAP - cardH, right: "auto" as const, bottom: "auto" as const };
  if (fitsBelow)
    return { left: centred, top: box.top + box.height + GAP, right: "auto" as const, bottom: "auto" as const };
  if (fitsAbove)
    return { left: centred, top: box.top - GAP - cardH, right: "auto" as const, bottom: "auto" as const };
  if (fitsRight)
    return { left: box.left + box.width + GAP, top: clampY(box.top), right: "auto" as const, bottom: "auto" as const };

  return { left: clampX(vw / 2 - CARD_W / 2), top: vh - cardH - 20, right: "auto" as const, bottom: "auto" as const };
}
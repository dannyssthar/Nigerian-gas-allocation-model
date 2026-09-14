"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "conversion", label: "Conversion" },
  { id: "netback", label: "Netback" },
  { id: "breakeven", label: "Break-even" },
  { id: "siting", label: "Siting" },
  { id: "method", label: "Method" },
];

/**
 * Navigation.
 *
 * Scroll-spy runs on IntersectionObserver rather than scroll offsets, so it
 * stays accurate when sections change height as the model recomputes. The
 * rootMargin pins the trigger line just under the nav bar, which means a
 * section becomes "current" when its heading reaches the bar rather than when
 * it first peeks into view.
 *
 * The active pill is a shared layoutId, so Framer Motion slides it between
 * links instead of cross-fading two pills. That single detail is most of what
 * makes a nav feel built rather than assembled.
 */
export default function Nav({ onReplayTour }: { onReplayTour: () => void }) {
  const [active, setActive] = useState("overview");

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-72px 0px -55% 0px", threshold: [0, 0.25, 0.6] }
    );

    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <motion.div className="djn-progress" style={{ scaleX: progress }} />

      <nav className="djn-nav" data-tour="nav" aria-label="Sections">
        <a href="#overview" className="djn-nav__mark" aria-label="DJN, back to top">
          <b>DJN</b>
          <span
            className="djn-eyebrow djn-eyebrow--accent"
            style={{ display: "none" }}
            data-wide
          >
            Gas Allocation Model
          </span>
        </a>

        <div className="djn-nav__links">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="djn-nav__link"
              aria-current={active === s.id}
            >
              {active === s.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="djn-nav__pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {s.label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", gap: "var(--s2)", flexShrink: 0, alignItems: "center" }}>
          <button
            className="djn-btn djn-btn--ghost"
            onClick={onReplayTour}
            style={{ padding: "8px 12px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M9.6 9.3a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16.6" r="1" fill="currentColor" />
            </svg>
            <span data-wide-label>Guide</span>
          </button>
          <ThemeToggle />
        </div>
      </nav>

      <style>{`
        @media (min-width: 900px) {
          .djn-nav__mark [data-wide] { display: inline !important; }
        }
        @media (max-width: 560px) {
          [data-wide-label] { display: none; }
        }
      `}</style>
    </>
  );
}
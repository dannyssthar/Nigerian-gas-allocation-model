"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const SECTIONS = [
  { id: "overview", label: "Overview", hint: "The answer, in one number" },
  { id: "conversion", label: "Conversion", hint: "How gas becomes compute" },
  { id: "netback", label: "Netback", hint: "The four competing uses" },
  { id: "breakeven", label: "Break-even", hint: "Where the answer flips" },
  { id: "siting", label: "Siting", hint: "Where it would be cheapest" },
  { id: "method", label: "Method", hint: "How the model works" },
];

/**
 * Navigation.
 *
 * Two distinct shapes rather than one squeezed. Above 900px the six sections
 * sit inline with a sliding pill marking position. Below that they collapse
 * into a full menu behind a hamburger, where each entry gets room for a line
 * of explanation. Cramming six abbreviated labels onto a phone would be
 * technically responsive and practically useless.
 *
 * Scroll-spy is IntersectionObserver rather than scroll offsets, so it stays
 * accurate while sections change height as the model recomputes.
 */
export default function Nav({ onReplayTour }: { onReplayTour: () => void }) {
  const [active, setActive] = useState("overview");
  const [menu, setMenu] = useState(false);

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

  // Escape closes, and the page behind the menu must not scroll.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <>
      <motion.div className="djn-progress" style={{ scaleX: progress }} />

      <nav className="djn-nav" data-tour="nav" aria-label="Sections">
        <a href="#top" className="djn-nav__mark" aria-label="DJN, back to top">
          <b>DJN</b>
          <span className="djn-eyebrow djn-eyebrow--accent djn-nav__sub">
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

        <div className="djn-nav__actions">
          <button
            className="djn-btn djn-btn--ghost djn-nav__guide"
            onClick={onReplayTour}
            style={{ padding: "8px 12px" }}
          >
            <GuideIcon />
            <span>Guide</span>
          </button>
          <ThemeToggle />

          <button
            className="djn-nav__burger"
            onClick={() => setMenu((m) => !m)}
            aria-expanded={menu}
            aria-controls="djn-mobile-menu"
            aria-label={menu ? "Close menu" : "Open menu"}
          >
            <span data-line="1" data-open={menu} />
            <span data-line="2" data-open={menu} />
            <span data-line="3" data-open={menu} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMenu(false)}
              className="djn-menu-scrim"
              aria-hidden="true"
            />
            <motion.div
              id="djn-mobile-menu"
              className="djn-menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <ul>
                {SECTIONS.map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + i * 0.045, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <a
                      href={`#${s.id}`}
                      onClick={() => setMenu(false)}
                      aria-current={active === s.id}
                      className="djn-menu__link"
                    >
                      <span className="djn-data-label djn-menu__num">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="djn-menu__label">{s.label}</span>
                        <span className="djn-menu__hint">{s.hint}</span>
                      </span>
                      {active === s.id && (
                        <span className="djn-menu__dot" aria-hidden="true" />
                      )}
                    </a>
                  </motion.li>
                ))}
              </ul>

              <div className="djn-menu__foot">
                <button
                  className="djn-btn djn-btn--accent"
                  style={{ width: "100%", padding: "13px" }}
                  onClick={() => {
                    setMenu(false);
                    onReplayTour();
                  }}
                >
                  <GuideIcon />
                  Take the walkthrough
                </button>
                <p className="djn-data-label" style={{ marginTop: "var(--s4)", textAlign: "center" }}>
                  DanJohn&ndash;Nwobi &middot; CPEEL, University of Ibadan
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function GuideIcon() {
  return (
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
  );
}
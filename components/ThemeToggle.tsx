"use client";

import { useEffect, useState } from "react";

/**
 * Theme toggle.
 *
 * Uses the View Transitions API rather than a JS tween: the browser snapshots
 * the old and new DOM, so the entire page crossfades under a circular clip
 * without React re-rendering anything. Light expands from the top and dark
 * from the bottom, which reads as the light rising and the dark falling.
 *
 * Falls back to an instant swap where the API is missing or the user has asked
 * for reduced motion.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("djn-theme", next);
      } catch {
        /* storage is blocked in sandboxed preview frames; the theme still
           applies for this session, it simply will not persist */
      }
      setTheme(next);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion:reduce)").matches;

    // Typed locally rather than relying on the DOM lib, which has shipped
    // startViewTransition in some TypeScript versions and not others. This
    // compiles either way.
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void> };
    };
    if (!doc.startViewTransition || reduced) return apply();

    const toDark = next === "dark";
    const x = window.innerWidth / 2;
    const y = toDark ? window.innerHeight : 0;
    const r = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    doc.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${r}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 750,
          easing: "cubic-bezier(0.16,1,0.3,1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }

  return (
    <button
      onClick={toggle}
      className="djn-btn"
      style={{ padding: "8px 14px" }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </>
        ) : (
          <path
            d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
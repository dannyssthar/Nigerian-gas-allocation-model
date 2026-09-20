"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import Btn from "./Button";

/**
 * The assumptions overlay: a centred modal, no longer a bottom drawer.
 *
 * The drawer version carried a drag gesture, and on a phone that gesture
 * fought the scroll gesture inside it \u2014 the first pixel of a scroll started a
 * drag, the sheet twitched, the scroll won, the sheet snapped back. That is
 * the shake. A centred panel makes no gesture promises it has to keep, so the
 * grip pill is gone too: an affordance for a gesture that no longer exists
 * would be a small lie.
 *
 * Centring is done by a flex wrapper, never by transforms. Framer Motion owns
 * an element's transform while animating it, so translate(-50%,-50%) centring
 * is silently destroyed mid-animation \u2014 the bug that beached the currency
 * panel in a corner. The wrapper ignores pointer events; only the panel and
 * the scrim receive them, so the page around the panel is never dead space.
 *
 * Height is 76svh on phones (WCAG 1.4.10: the content reflows and scrolls
 * inside, nothing is cut off-screen) and capped at 80vh on desktop.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="djn-overlay" style={{ zIndex: 180 }}>
          <motion.div
            className="djn-overlay__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="djn-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", stiffness: 340, damping: 32, mass: 0.9 }}
          >
            <div className="djn-panel__head">
              <h2 className="djn-title" style={{ fontSize: "1.05rem" }}>
                {title}
              </h2>
              <Btn variant="ghost" onClick={onClose}>
                Done
              </Btn>
            </div>
            <div className="djn-panel__body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
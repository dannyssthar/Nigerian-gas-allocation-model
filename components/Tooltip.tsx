"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "@/lib/glossary";

type Placement = "top" | "bottom";

/**
 * Tooltip.
 *
 * Positioned with `position: fixed` from a measured rect rather than absolute
 * offsets, because the triggers sit inside cards, scrolling tables and a
 * bottom sheet, any of which would clip an absolutely positioned popover. It
 * flips above or below depending on the room available and clamps itself
 * inside the viewport, so it never runs off a phone screen.
 *
 * Opens on hover and focus for pointer users, on tap for touch. Escape closes
 * it, so does scrolling, because a tooltip anchored to a moving element is
 * worse than no tooltip.
 */
function useTip() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; place: Placement }>({
    x: 0,
    y: 0,
    place: "top",
  });
  const anchor = useRef<HTMLElement>(null);

  const measure = useCallback(() => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const roomAbove = r.top;
    const place: Placement = roomAbove > 190 ? "top" : "bottom";
    const half = Math.min(320, window.innerWidth - 32) / 2;
    const x = Math.min(
      Math.max(r.left + r.width / 2, half + 16),
      window.innerWidth - half - 16
    );
    setPos({ x, y: place === "top" ? r.top - 10 : r.bottom + 10, place });
  }, []);

  /* VS Code behaviour: the bubble must survive the pointer travelling from the
     trigger into it, otherwise the text can never be selected or copied. A
     short grace period covers that gap, and entering the bubble cancels it. */
  const clearTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearTimer();
    measure();
    setOpen(true);
  }, [measure, clearTimer]);

  /** Immediate: Escape, scroll, outside click. */
  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  /** Delayed: pointer left the trigger, but may be on its way to the bubble. */
  const hideSoon = useCallback(() => {
    clearTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 260);
  }, [clearTimer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open, hide]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    open,
    pos,
    anchor,
    show,
    hide,
    hideSoon,
    keepOpen: clearTimer,
    toggle: () => (open ? hide() : show()),
  };
}

/**
 * Renders into document.body once mounted.
 *
 * Two reasons, and the first is not optional. Triggers sit inside running
 * prose, so a bubble rendered in place would put a <div> inside a <p>, which
 * the HTML parser silently rewrites and React then flags as a hydration
 * mismatch. Second, a portal escapes every ancestor's overflow and stacking
 * context, so the bubble cannot be clipped by the scrolling site table or the
 * mobile sheet.
 *
 * Returns null before mount because document does not exist during server
 * rendering.
 */
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function Bubble({
  open,
  pos,
  id,
  title,
  body,
  onEnter,
  onLeave,
}: {
  open: boolean;
  pos: { x: number; y: number; place: Placement };
  id: string;
  title: string;
  body: string;
  onEnter?: () => void;
  onLeave?: () => void;
}) {
  return (
    <Portal>
      <AnimatePresence>
        {open && (
        <motion.div
          id={id}
          role="tooltip"
          className="djn-tip"
          initial={{ opacity: 0, y: pos.place === "top" ? 6 : -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.place === "top" ? 4 : -4, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{
            left: pos.x,
            top: pos.y,
            transform: `translate(-50%, ${pos.place === "top" ? "-100%" : "0"})`,
            // selectable, so a reader can copy a definition or a formula out
            userSelect: "text",
            WebkitUserSelect: "text",
            cursor: "auto",
            pointerEvents: "auto",
          }}
        >
          <strong>{title}</strong>
          {body}
        </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** A dotted-underlined term inside running text. */
export function Term({
  k,
  children,
}: {
  k: keyof typeof GLOSSARY;
  children: React.ReactNode;
}) {
  const { open, pos, anchor, show, hide, hideSoon, keepOpen, toggle } = useTip();
  const id = useId();
  const entry = GLOSSARY[k];

  return (
    <>
      <button
        ref={anchor as React.RefObject<HTMLButtonElement>}
        className="djn-term"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onFocus={show}
        onBlur={hideSoon}
        onClick={(e) => {
          e.preventDefault();
          toggle();
        }}
      >
        {children}
      </button>
      <Bubble open={open} pos={pos} id={id} title={entry.title} body={entry.body}
        onEnter={keepOpen} onLeave={hideSoon} />
    </>
  );
}

/** A small circled "i" for labels and headings, where an underline would be noise. */
export function Info({ k, label }: { k: keyof typeof GLOSSARY; label?: string }) {
  const { open, pos, anchor, show, hide, hideSoon, keepOpen, toggle } = useTip();
  const id = useId();
  const entry = GLOSSARY[k];

  return (
    <>
      <button
        ref={anchor as React.RefObject<HTMLButtonElement>}
        className="djn-info"
        aria-label={label ?? `What is ${entry.title}?`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onFocus={show}
        onBlur={hideSoon}
        onClick={(e) => {
          e.preventDefault();
          toggle();
        }}
      >
        i
      </button>
      <Bubble open={open} pos={pos} id={id} title={entry.title} body={entry.body}
        onEnter={keepOpen} onLeave={hideSoon} />
    </>
  );
}

/** Free-form tooltip for things not in the glossary, e.g. a specific figure. */
export function Hint({ title, body }: { title: string; body: string }) {
  const { open, pos, anchor, show, hide, hideSoon, keepOpen, toggle } = useTip();
  const id = useId();

  return (
    <>
      <button
        ref={anchor as React.RefObject<HTMLButtonElement>}
        className="djn-info"
        aria-label={title}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onFocus={show}
        onBlur={hideSoon}
        onClick={(e) => {
          e.preventDefault();
          toggle();
        }}
      >
        i
      </button>
      <Bubble open={open} pos={pos} id={id} title={title} body={body}
        onEnter={keepOpen} onLeave={hideSoon} />
    </>
  );
}


/**
 * A unit or abbreviation rendered inline, with its full name on hover.
 *
 * Every short form in the interface goes through this. MMBtu, PUE, kWh,
 * ATC&C, P90: a reader should never meet a symbol whose meaning is a search
 * away. The bubble survives the pointer crossing into it, so the definition
 * can be selected and copied.
 */
export function Unit({
  k,
  children,
}: {
  k: keyof typeof GLOSSARY;
  children?: React.ReactNode;
}) {
  const { open, pos, anchor, show, hide, hideSoon, keepOpen, toggle } = useTip();
  const id = useId();
  const entry = GLOSSARY[k];
  // Fall back to the part of the title before the separator, so <Unit k="MMBtu" />
  // renders "MMBtu" without the label having to be repeated at every call site.
  const label = children ?? entry.title.split(" · ")[0];

  return (
    <>
      <button
        ref={anchor as React.RefObject<HTMLButtonElement>}
        className="djn-term djn-term--unit"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onFocus={show}
        onBlur={hideSoon}
        onClick={(e) => {
          e.preventDefault();
          toggle();
        }}
      >
        {label}
      </button>
      <Bubble
        open={open}
        pos={pos}
        id={id}
        title={entry.title}
        body={entry.body}
        onEnter={keepOpen}
        onLeave={hideSoon}
      />
    </>
  );
}
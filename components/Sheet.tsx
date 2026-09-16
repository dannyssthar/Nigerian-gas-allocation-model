"use client";

import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * The bottom sheet.
 *
 * Previously this was a panel that appeared and disappeared on a button. It
 * had the shape of a sheet without any of the behaviour, which is worse than
 * not looking like one: it makes a promise the surface does not keep. Anyone
 * who has used a phone tries to drag it down within about two seconds.
 *
 * What a real sheet does, all of which is implemented here:
 *
 *   - It tracks the finger one-to-one while dragging down, so it feels
 *     attached rather than animated at.
 *   - It resists upward drag instead of refusing it. Rubber-banding tells the
 *     hand it has reached the top; a hard stop just feels broken.
 *   - It dismisses on either distance OR velocity. A short fast flick must
 *     close it, because that is the gesture people actually make. Requiring
 *     distance alone is the single most common reason a sheet feels sticky.
 *   - It returns with a spring if released short of the threshold, so an
 *     abandoned gesture is undone rather than punished.
 *   - Its backdrop fades in proportion to the drag, so the gesture is
 *     reversible in the user's eyes right up to the moment they let go.
 *   - It only drags when the content is scrolled to the top. Otherwise the
 *     same downward gesture means scroll, and hijacking it makes the content
 *     unreadable.
 *
 * The handle is not decoration. It is the affordance that says this can be
 * dragged, and it is also a target in its own right, so a drag started on it
 * works even when the content beneath is mid-scroll.
 */

const DISMISS_DISTANCE = 110; // px dragged before release closes it
const DISMISS_VELOCITY = 520; // px/s, a flick

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
  const y = useMotionValue(0);
  const controls = useDragControls();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canDrag, setCanDrag] = useState(true);

  useEffect(() => setMounted(true), []);

  /* Backdrop opacity follows the sheet. Dragging halfway down leaves the page
     behind visibly half-revealed, which is what makes the gesture feel
     reversible rather than committed. */
  const backdrop = useTransform(y, [0, 400], [1, 0], { clamp: true });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    y.set(0);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, y]);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const shouldClose =
      info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY;
    if (shouldClose) onClose();
    else y.set(0); // the spring in dragTransition carries it home
  }

  /* Drag from the body only when the content is already at the top. Below
     that, a downward gesture means scroll, and taking it would make the
     assumptions list unusable. The handle ignores this rule. */
  function maybeStartDrag(e: React.PointerEvent) {
    const el = scrollRef.current;
    if (!el || el.scrollTop <= 0) controls.start(e);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setCanDrag(el.scrollTop <= 0);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="djn-sheet__scrim"
            style={{ opacity: backdrop }}
            initial={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className="djn-sheet r-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            style={{ y }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            /* Entry and exit use the same spring, so opening and closing are
               recognisably the same motion played in two directions. */
            transition={{ type: "spring", stiffness: 320, damping: 36, mass: 0.9 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            /* Asymmetric on purpose: almost no give upward, generous give
               downward. The sheet is at its ceiling, and the hand should feel
               that without being stopped dead. */
            dragElastic={{ top: 0.02, bottom: 0.9 }}
            dragTransition={{ bounceStiffness: 420, bounceDamping: 40 }}
            onDragEnd={handleDragEnd}
            onPointerDown={maybeStartDrag}
          >
            {/* The handle: affordance and target in one. Padded far beyond its
                visible size, because a 4px bar is not a touch target. */}
            <div
              className="djn-sheet__grip"
              onPointerDown={(e) => {
                e.stopPropagation();
                controls.start(e);
              }}
            >
              <span data-active={!canDrag ? "false" : "true"} />
            </div>

            <div className="djn-sheet__head">
              <h2 className="djn-title" style={{ fontSize: "1.05rem" }}>
                {title}
              </h2>
              <button className="djn-btn djn-btn--ghost r-pill" onClick={onClose}>
                Done
              </button>
            </div>

            <div className="djn-sheet__body" ref={scrollRef}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
/**
 * Reference-counted body scroll lock.
 *
 * Two overlays can be open at once (the assumptions panel with the currency
 * picker over it). If each one sets and clears body overflow independently,
 * the first to close unlocks the page underneath the one still open \u2014 and a
 * stale lock is exactly the "site is frozen until I refresh" bug. A counter
 * means the body unlocks only when the LAST overlay closes, no matter the
 * order.
 */
let count = 0;

export function lockScroll() {
  count += 1;
  if (count === 1) document.body.style.overflow = "hidden";
}

export function unlockScroll() {
  count = Math.max(0, count - 1);
  if (count === 0) document.body.style.overflow = "";
}
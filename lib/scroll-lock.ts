/**
 * Reference-counted page scroll lock.
 *
 * Locked on the DOCUMENT ELEMENT, not the body, and the distinction is the
 * whole bug this file once had. Our stylesheet gives html `overflow-x: clip`,
 * and per the CSS overflow rules, once html has any non-visible overflow the
 * browser stops propagating body's overflow to the viewport. So hiding
 * overflow on body (a) did not stop the page scrolling \u2014 html is the real
 * scroller \u2014 and (b) broke `position: sticky` for everything inside body,
 * because a sticky element pins itself against its nearest scroll container
 * and an overflow-hidden body became that container. One wrong target, two
 * symptoms: the background kept scrolling behind overlays, and the sidebar
 * stopped sticking.
 *
 * The counter remains: two overlays can stack (assumptions panel with the
 * currency picker over it), and the page must unlock only when the LAST one
 * closes, whatever the closing order.
 */
let count = 0;

export function lockScroll() {
  count += 1;
  if (count === 1) document.documentElement.style.overflow = "hidden";
}

export function unlockScroll() {
  count = Math.max(0, count - 1);
  if (count === 0) document.documentElement.style.overflow = "";
}
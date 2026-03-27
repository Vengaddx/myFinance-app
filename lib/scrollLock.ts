/**
 * Ref-counted body scroll lock.
 *
 * Multiple modals can call lockScroll() independently — the body only
 * unlocks when every caller has called unlockScroll(). This prevents the
 * race condition where one modal closing restores scroll while another
 * modal is still open.
 *
 * Uses the position:fixed technique (instead of overflow:hidden alone)
 * because Android Chrome in PWA / standalone mode can still allow
 * rubber-band scroll when only overflow is set.
 */

let lockCount = 0;
let savedScrollY = 0;

export function lockScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = "100%";
  }
  lockCount++;
}

export function unlockScroll(): void {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const scrollY = savedScrollY;
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    // requestAnimationFrame defers scrollTo until after the browser has had one
    // frame to recalculate layout and update the compositor's (APZ) scroll model.
    // Without this, Android Chrome does not recognise the document as scrollable
    // again immediately after position:fixed is removed, so the first pan gesture
    // after a modal closes silently does nothing.
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }
}

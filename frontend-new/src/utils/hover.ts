/**
 * True on devices with a real hovering pointer (mouse, trackpad). Phones and
 * tablets report "mouse" pointer events after taps in some browsers; hover
 * previews there would pop up on every tap and stay pinned.
 */
export function canHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true;
}

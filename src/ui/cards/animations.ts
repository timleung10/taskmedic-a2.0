export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function syncMotionPreference(): void {
  document.documentElement.dataset.reducedMotion = prefersReducedMotion() ? "true" : "false";
}

export function applySwipeTransition(el: HTMLElement, enabled: boolean): void {
  if (!enabled || prefersReducedMotion()) {
    el.style.transition = "none";
    return;
  }
  el.style.transition = "transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1)";
}

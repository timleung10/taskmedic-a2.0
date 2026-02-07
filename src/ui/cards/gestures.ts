import { applySwipeTransition, prefersReducedMotion } from "./animations";

const ACTION_WIDTH = 148;
const LONG_PRESS_MS = 460;
const HORIZONTAL_SLOP = 10;

export type CardGestureHandlers = {
  onLongPressToggle: (id: string) => void;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("button,input,select,textarea,a,label,[data-no-gesture='true']"));
}

function setTranslateX(surface: HTMLElement, x: number, animate: boolean): void {
  applySwipeTransition(surface, animate);
  surface.style.transform = `translateX(${x}px)`;
  surface.dataset.swipeOpen = x < 0 ? "true" : "false";
}

function closeOtherOpenCards(root: HTMLElement, keepId: string): void {
  root.querySelectorAll<HTMLElement>(".tm-card-surface[data-swipe-open='true']").forEach((node) => {
    const id = node.dataset.cardId ?? "";
    if (id && id !== keepId) setTranslateX(node, 0, true);
  });
}

export function bindCardGestures(root: HTMLElement, handlers: CardGestureHandlers): () => void {
  const cleanups: Array<() => void> = [];
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".tm-card-surface"));

  cards.forEach((surface) => {
    const id = surface.dataset.cardId ?? "";
    if (!id) return;

    let pointerId = -1;
    let startX = 0;
    let startY = 0;
    let offsetStart = 0;
    let currentOffset = 0;
    let swiping = false;
    let longPressTriggered = false;
    let longTimer: number | undefined;

    const clearTimer = () => {
      if (longTimer !== undefined) {
        window.clearTimeout(longTimer);
        longTimer = undefined;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (isInteractiveTarget(e.target)) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      offsetStart = surface.dataset.swipeOpen === "true" ? -ACTION_WIDTH : 0;
      currentOffset = offsetStart;
      swiping = false;
      longPressTriggered = false;
      clearTimer();
      longTimer = window.setTimeout(() => {
        longPressTriggered = true;
        surface.dataset.ignoreTapUntil = String(Date.now() + 420);
        handlers.onLongPressToggle(id);
      }, LONG_PRESS_MS);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!swiping && absDx > HORIZONTAL_SLOP && absDx > absDy) {
        swiping = true;
        clearTimer();
        closeOtherOpenCards(root, id);
      }

      if (!swiping) {
        if (absDy > HORIZONTAL_SLOP && absDy > absDx) clearTimer();
        return;
      }

      e.preventDefault();
      clearTimer();
      const next = Math.max(-ACTION_WIDTH, Math.min(0, offsetStart + dx));
      currentOffset = next;
      setTranslateX(surface, currentOffset, false);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      clearTimer();

      if (longPressTriggered) return;

      if (!swiping) {
        if (surface.dataset.swipeOpen === "true") {
          const movedX = Math.abs(e.clientX - startX);
          const movedY = Math.abs(e.clientY - startY);
          if (movedX < 8 && movedY < 8) {
            surface.dataset.ignoreTapUntil = String(Date.now() + 280);
            setTranslateX(surface, 0, true);
          }
        }
        return;
      }

      const shouldOpen = currentOffset <= -ACTION_WIDTH * 0.45;
      setTranslateX(surface, shouldOpen ? -ACTION_WIDTH : 0, true);
      surface.dataset.ignoreTapUntil = String(Date.now() + (prefersReducedMotion() ? 0 : 180));
    };

    const onPointerCancel = () => {
      pointerId = -1;
      clearTimer();
      setTranslateX(surface, 0, true);
    };

    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("pointermove", onPointerMove, { passive: false });
    surface.addEventListener("pointerup", onPointerUp);
    surface.addEventListener("pointercancel", onPointerCancel);
    surface.style.touchAction = "pan-y";

    cleanups.push(() => {
      clearTimer();
      surface.removeEventListener("pointerdown", onPointerDown);
      surface.removeEventListener("pointermove", onPointerMove);
      surface.removeEventListener("pointerup", onPointerUp);
      surface.removeEventListener("pointercancel", onPointerCancel);
    });
  });

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

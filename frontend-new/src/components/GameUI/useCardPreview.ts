import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { useUIStore } from '../../store/uiStore';

const LONG_PRESS_MS = 450; // same as the Phaser table (pointerBinding.ts)

/**
 * Card preview handlers for DOM cards: a mouse previews on hover; touch has
 * no hover, so press-and-hold previews until the finger lifts. A click that
 * ends a hold should be ignored: check `endedLongPress()` in onClick.
 */
export function useCardPreview() {
  const setHoveredCard = useUIStore((state) => state.setHoveredCard);
  const timer = useRef<number | undefined>(undefined);
  const held = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const endHold = () => {
    window.clearTimeout(timer.current);
    if (held.current) setHoveredCard(null);
  };

  const previewProps = (card: string) => ({
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHoveredCard(card);
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setHoveredCard(null);
      else endHold();
    },
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      held.current = false;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        held.current = true;
        setHoveredCard(card);
      }, LONG_PRESS_MS);
    },
    onPointerUp: (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') endHold();
    },
    onPointerCancel: endHold,
    // A long press would otherwise open the browser's context menu.
    onContextMenu: (e: MouseEvent) => e.preventDefault(),
  });

  const endedLongPress = () => {
    const wasHeld = held.current;
    held.current = false;
    return wasHeld;
  };

  return { previewProps, endedLongPress };
}

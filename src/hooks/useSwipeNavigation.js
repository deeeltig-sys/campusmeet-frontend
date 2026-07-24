import { useRef, useState } from 'react';

const DEFAULT_THRESHOLD = 40; // px of drag before it commits to navigating

/**
 * One shared swipe-gesture implementation instead of every swipeable
 * screen reinventing its own touch/pointer handling slightly
 * differently. Returns drag state (for the live-follow-the-finger
 * transform) plus the pointer/touch event handlers to spread onto the
 * swipeable container.
 *
 * onSwipeLeft / onSwipeRight fire once the drag crosses `threshold`
 * and the finger/mouse is released — not mid-drag.
 */
export function useSwipeNavigation({ onSwipeLeft, onSwipeRight, threshold = DEFAULT_THRESHOLD, disabled = false }) {
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  function getX(e) {
    return e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? 0;
  }

  function handleStart(e) {
    if (disabled) return;
    startX.current = getX(e);
    setDragging(true);
  }
  function handleMove(e) {
    if (disabled || !dragging) return;
    setDragOffset(getX(e) - startX.current);
  }
  function handleEnd(e) {
    if (disabled || !dragging) return;
    setDragging(false);
    const finalOffset = getX(e) - startX.current || dragOffset;
    if (finalOffset <= -threshold) onSwipeLeft?.();
    else if (finalOffset >= threshold) onSwipeRight?.();
    setDragOffset(0);
  }

  const handlers = {
    onPointerDown: handleStart,
    onPointerMove: handleMove,
    onPointerUp: handleEnd,
    onPointerCancel: handleEnd,
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
  };

  return { dragOffset, dragging, handlers };
}

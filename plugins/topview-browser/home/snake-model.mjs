/**
 * Pure logic for the homepage feature-card snake easter egg (no DOM), so it can be unit tested.
 * Length is shared by the three cards: it grows while any card is hovered and only resets when the
 * pointer has been outside the cards for longer than `resetAfter` before coming back.
 */
export const SNAKE_DEFAULTS = Object.freeze({ initial: 2, max: 12, growEvery: 900, resetAfter: 3000 });

export function createSnakeLength(options = {}) {
  const o = { ...SNAKE_DEFAULTS, ...options };
  let length = o.initial;
  let hovering = false;
  let leftAt = null;
  let grewAt = 0;
  return {
    enter(now) {
      if (hovering) return length;
      if (leftAt !== null && now - leftAt > o.resetAfter) length = o.initial;
      hovering = true;
      grewAt = now;
      return length;
    },
    leave(now) {
      if (!hovering) return;
      hovering = false;
      leftAt = now;
    },
    tick(now) {
      if (!hovering) return length;
      while (length < o.max && now - grewAt >= o.growEvery) {
        length += 1;
        grewAt += o.growEvery;
      }
      if (length >= o.max) grewAt = now;
      return length;
    },
    get length() { return length; },
    get hovering() { return hovering; },
  };
}

/** One grid step from `head` toward `target`, along the axis with the larger gap (Snake never moves diagonally). */
export function stepToward(head, target) {
  const dx = target.x - head.x;
  const dy = target.y - head.y;
  if (!dx && !dy) return head;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: head.x + Math.sign(dx), y: head.y };
  return { x: head.x, y: head.y + Math.sign(dy) };
}

/** Milliseconds per cell: quick when the cursor is far away, easing to a slower crawl as the head arrives. */
export function stepInterval(distance) {
  return Math.round(Math.max(16, Math.min(72, 76 - distance * 4)));
}

/**
 * Easter egg: one 8-bit snake follows the cursor across the homepage feature-card area.
 * A single pointer-events:none canvas spans the whole .hero-cards grid on one common 8px grid and is
 * clipped to the union of the three card shapes (border radius included), so the gaps hide the snake and
 * it visibly tunnels from one card into the next. requestAnimationFrame only runs while it is visible or
 * fading out. Off under prefers-reduced-motion and for touch input. Colour comes from CSS (.hero-snake).
 */
import { SNAKE_DEFAULTS, createSnakeLength, stepToward, stepInterval } from "./snake-model.mjs";

const CELL = 8;
const FADE_MS = 360;
const MAX_HISTORY = 13;
// Covers the 2px card hover-lift transition, whose clip shape is re-read on every drawn frame.
const SETTLE_MS = 300;
const area = document.querySelector(".hero-cards");
const cards = area ? [...area.querySelectorAll(".hero-card")] : [];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

if (area && cards.length) {
  const model = createSnakeLength();
  const canvas = document.createElement("canvas");
  canvas.className = "hero-snake";
  canvas.setAttribute("aria-hidden", "true");
  area.append(canvas);
  const ctx = canvas.getContext("2d");
  const s = { cells: [], target: { x: 0, y: 0 }, inside: false, visible: false, lastStep: 0, leftAt: 0, settleUntil: 0, dpr: 1, width: 0, height: 0, color: "" };
  let frame = 0, wake = 0, drawnKey = "";
  const schedule = () => { if (!frame) frame = requestAnimationFrame(loop); };
  const resume = () => { clearTimeout(wake); wake = 0; schedule(); };
  const halt = () => { clearTimeout(wake); wake = 0; cancelAnimationFrame(frame); frame = 0; };

  const resize = () => {
    const rect = area.getBoundingClientRect();
    s.dpr = Math.max(1, window.devicePixelRatio || 1);
    s.width = Math.ceil(rect.width);
    s.height = Math.ceil(rect.height);
    canvas.width = Math.round(s.width * s.dpr);
    canvas.height = Math.round(s.height * s.dpr);
  };
  const cellAt = (event) => {
    const rect = area.getBoundingClientRect();
    return {
      x: Math.min(Math.floor(s.width / CELL) - 1, Math.max(0, Math.floor((event.clientX - rect.left) / CELL))),
      y: Math.min(Math.floor(s.height / CELL) - 1, Math.max(0, Math.floor((event.clientY - rect.top) / CELL))),
    };
  };
  // Union of the card shapes in canvas space, re-read every frame (cards lift 2px on hover).
  const cardClip = () => {
    const origin = area.getBoundingClientRect();
    const path = new Path2D();
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const radius = parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0;
      path.roundRect(r.left - origin.left, r.top - origin.top, r.width, r.height, radius);
    }
    return path;
  };
  const overCard = (event) => cards.some((card) => {
    const r = card.getBoundingClientRect();
    return event.clientX >= r.left && event.clientX < r.right && event.clientY >= r.top && event.clientY < r.bottom;
  });

  const draw = (alpha) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (alpha <= 0 || !s.cells.length) return;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.save();
    ctx.clip(cardClip());
    ctx.fillStyle = s.color;
    const length = model.length;
    for (let i = Math.min(length, s.cells.length) - 1; i >= 0; i -= 1) {
      const c = s.cells[i];
      ctx.globalAlpha = alpha * (i === 0 ? 1 : 0.88 - (0.5 * i) / length);
      ctx.fillRect(c.x * CELL + 1, c.y * CELL + 1, CELL - 2, CELL - 2);
    }
    // 8-bit eye: a 2px notch in the head, on the side it is travelling toward.
    const [head, neck = head] = s.cells;
    const dx = Math.sign(head.x - neck.x) || 1;
    const dy = Math.sign(head.y - neck.y);
    ctx.globalAlpha = 1;
    ctx.clearRect(head.x * CELL + (dx > 0 ? 4 : 2), head.y * CELL + (dy > 0 ? 4 : 2), 2, 2);
    ctx.restore();
  };

  const loop = (now) => {
    frame = 0;
    if (s.dpr !== Math.max(1, window.devicePixelRatio || 1)) { resize(); drawnKey = ""; }
    if (!s.inside) {
      const alpha = 1 - (now - s.leftAt) / FADE_MS;
      draw(alpha);
      if (alpha <= 0) { s.visible = false; s.cells = []; drawnKey = ""; return; }
      schedule();
      return;
    }
    model.tick(now);
    let head = s.cells[0];
    let interval = stepInterval(Math.abs(s.target.x - head.x) + Math.abs(s.target.y - head.y));
    if (now - s.lastStep > 240) s.lastStep = now - interval;
    while (now - s.lastStep >= interval) {
      const next = stepToward(head, s.target);
      if (next === head) { s.lastStep = now; break; }
      s.cells.unshift(next);
      if (s.cells.length > MAX_HISTORY) s.cells.length = MAX_HISTORY;
      head = next;
      s.settleUntil = now + SETTLE_MS;
      s.lastStep += interval;
      interval = stepInterval(Math.abs(s.target.x - head.x) + Math.abs(s.target.y - head.y));
    }
    const key = `${model.length}:${head.x},${head.y}:${s.cells.length}`;
    const settling = now < s.settleUntil;
    if (settling || key !== drawnKey) { draw(1); drawnKey = key; }
    if (settling || stepToward(head, s.target) !== head) { schedule(); return; }
    // At rest: no per-frame redraws; wake only for the next growth step, then stop until the pointer moves.
    if (model.length < SNAKE_DEFAULTS.max) wake = setTimeout(resume, SNAKE_DEFAULTS.growEvery);
  };

  const enter = (event) => {
    const now = performance.now();
    model.enter(now);
    if (!s.visible || !s.width) resize();
    s.color = getComputedStyle(canvas).color;
    s.target = cellAt(event);
    if (!s.visible || !s.cells.length) s.cells = [s.target, s.target];
    s.inside = true;
    s.visible = true;
    s.lastStep = now;
    s.settleUntil = now + SETTLE_MS;
    drawnKey = "";
    resume();
  };
  const leave = () => {
    if (!s.inside) return;
    s.inside = false;
    s.leftAt = performance.now();
    model.leave(s.leftAt);
    resume();
  };

  // The pointer is "inside" while over any card; crossing the gap between cards keeps it inside (and keeps
  // steering), so only leaving the whole card area starts the fade and the 3s reset clock.
  area.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || reducedMotion.matches || !ctx) return;
    if (s.inside) { s.target = cellAt(event); resume(); }
    else if (overCard(event)) enter(event);
  });
  area.addEventListener("pointerleave", leave);
  area.addEventListener("pointercancel", leave);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    halt();
    s.inside = false; s.visible = false; s.cells = []; drawnKey = "";
    draw(0);
  });

  if ("ResizeObserver" in window) new ResizeObserver(() => { if (s.visible) { resize(); drawnKey = ""; resume(); } }).observe(area);
  reducedMotion.addEventListener?.("change", () => {
    if (!reducedMotion.matches) return;
    halt();
    s.inside = false; s.visible = false; s.cells = []; drawnKey = "";
    draw(0);
  });
}

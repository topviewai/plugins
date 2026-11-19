/** Pure Motion Studio composer rules, kept DOM-free so they can be unit tested. */
export const MOTION_MAX_ASSETS = 20;

const REQUIRED_ASSET_CATEGORIES = new Set(["Motion Graphics", "Product Launch"]);
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : undefined);

/** Product rule: only Motion Graphics / Product Launch require an image or video.
 * minVideos from a catalog does NOT add a requirement to other categories. The host currently has an
 * older validator (see services.ts); it must be aligned before end-to-end optional uploads are guaranteed.
 * Preserve the catalog upper bound, when the adapter actually supplies it.
 */
export function motionAssetRange(template) {
  if (!template) return { min: 0, max: MOTION_MAX_ASSETS };
  const inputs = template.inputs || {};
  const declaredMax = count(inputs.maxVideos) ?? count(template.maxVideos) ?? MOTION_MAX_ASSETS;
  const min = REQUIRED_ASSET_CATEGORIES.has(template.category) ? 1 : 0;
  const max = Math.max(min, Math.min(declaredMax, MOTION_MAX_ASSETS));
  return { min, max };
}

/** Locale key and slot values describing a range, e.g. ["motion.assets.range", { min: 1, max: 3 }]. */
export function motionAssetHint({ min, max }) {
  if (!min) return max < MOTION_MAX_ASSETS ? ["motion.assets.optionalMax", { max: max }] : ["motion.assets.optional", {}];
  if (min === max) return ["motion.assets.exact", { count: min }];
  if (max >= MOTION_MAX_ASSETS) return ["motion.assets.min", { min: min }];
  return ["motion.assets.range", { min: min, max: max }];
}

/**
 * Whether the brief can be handed to the Agent, and if not the first thing the
 * user still has to do (as a locale key with slot values).
 */
export function motionReadiness({ template, idea = "", assets = 0 }) {
  if (!template) return { ready: false, reason: ["motion.pickStyleFirst", {}] };
  const range = motionAssetRange(template);
  if (assets < range.min) return { ready: false, reason: ["motion.assets.required", {}], assets: true };
  if (assets > range.max) return { ready: false, reason: motionAssetHint(range), assets: true };
  if (!idea.trim()) return { ready: false, reason: ["motion.selectedStyle", { style: template.label }] };
  return { ready: true, reason: null };
}

/** Merge newly picked files into the current list without duplicates, capped at the max. */
export function mergeMotionFiles(current, incoming, max = MOTION_MAX_ASSETS) {
  const key = (file) => [file.name, file.size, file.lastModified].join(":");
  const seen = new Set(current.map(key));
  const merged = [...current];
  let overflow = false;
  for (const file of incoming) {
    if (seen.has(key(file))) continue;
    if (merged.length >= max) { overflow = true; continue; }
    seen.add(key(file));
    merged.push(file);
  }
  return { files: merged, overflow };
}

/** Roving-focus target for tablist arrow keys; returns the next index or -1 to ignore. */
export function nextTabIndex(key, index, length, rtl = false) {
  if (!length) return -1;
  const forward = rtl ? "ArrowLeft" : "ArrowRight";
  const backward = rtl ? "ArrowRight" : "ArrowLeft";
  if (key === forward) return (index + 1) % length;
  if (key === backward) return (index - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return -1;
}

/**
 * Poster sequence for the homepage mosaic wall: unique posters (capped) repeated
 * with a per-row offset so neighbours rarely match. Empty when too few to look intentional.
 */
export function motionWallPosters(templates, { tiles = 84, unique = 24, columns = 6, minimum = 4 } = {}) {
  const posters = [...new Set((templates || []).map((item) => item?.poster).filter((value) => typeof value === "string" && value))].slice(0, unique);
  if (posters.length < minimum) return [];
  return Array.from({ length: tiles }, (_, index) => posters[(index + Math.floor(index / columns) * 3) % posters.length]);
}

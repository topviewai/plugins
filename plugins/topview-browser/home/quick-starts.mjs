import { homeError } from "./errors.mjs";
/**
 * Turns an operated idea into an editable draft on its scene's flow config. Selection only
 * prepares the draft; it never submits.
 */
export function resolveQuickStart(scenarios, catalog, type, idea, sceneName = "") {
  const base = scenarios.find((s) => s.id === type && s.group === "create");
  if (!base || !idea?.key || !idea.prompt) throw homeError("errors.sceneNotFound");
  const selectedSkill = idea.skillName
    ? catalog.find((s) => s.skillName === idea.skillName)
    : null;
  if (idea.skillName && !selectedSkill)
    throw homeError("errors.sceneSkillUnavailable");
  const { gallery, ...scene } = base;
  delete scene.sourceSkillId;
  delete scene.sourceSkillName;
  delete scene.sourceSkillType;
  return {
    ...scene,
    presetId: idea.key,
    name: idea.title ? `${sceneName || base.name} · ${idea.title}` : sceneName || base.name,
    prompt: idea.prompt,
    ...(selectedSkill
      ? {
          sourceSkillId: selectedSkill.id,
          sourceSkillName: selectedSkill.skillName,
          sourceSkillType: selectedSkill.source,
        }
      : {}),
  };
}

export const IDEA_BATCH_SIZE = 3;

export function ideaBatch(pool, index) {
  return pool.slice(index * IDEA_BATCH_SIZE, index * IDEA_BATCH_SIZE + IDEA_BATCH_SIZE);
}

const BATCH_KEY = "topview-home-idea-batches";

/**
 * 换一批: a shuffle bag of batch indices per scene, kept in sessionStorage, so every
 * batch shows once per round and the next batch is never the one on screen.
 */
export function createBatchPicker({ storage = globalThis.sessionStorage, random = Math.random } = {}) {
  let memory = {};
  const read = () => {
    try {
      const value = JSON.parse(storage?.getItem(BATCH_KEY) ?? "null");
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {}
    return memory;
  };
  const write = (value) => {
    memory = value;
    try { storage?.setItem(BATCH_KEY, JSON.stringify(value)); } catch {}
  };
  return {
    current(scene) {
      const entry = read()[scene];
      return Number.isInteger(entry?.current) ? entry.current : 0;
    },
    next(scene, count) {
      const state = read();
      const entry = state[scene] || {};
      const current = Number.isInteger(entry.current) && entry.current < count ? entry.current : 0;
      if (count < 2) return current;
      let bag = Array.isArray(entry.bag) ? entry.bag.filter((i) => Number.isInteger(i) && i >= 0 && i < count && i !== current) : [];
      if (!bag.length) {
        bag = Array.from({ length: count }, (_, i) => i).filter((i) => i !== current);
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
      }
      const index = bag.pop();
      write({ ...state, [scene]: { bag, current: index } });
      return index;
    },
  };
}

// Empty "我的项目" CTA: one ready-to-edit creation task, operated and localized in the
// Topview ops console. "@topview" stays literal in every language.
const STORAGE_KEY = "topview-home-starter-bag";

/**
 * Shuffle bag: every theme appears once per round in random order, and a new round
 * never starts with the theme that ended the previous one, so consecutive picks
 * always differ. State lives in sessionStorage (per tab) keyed by theme, so a list
 * update from the ops console never points at the wrong prompt; storage failures
 * fall back to memory.
 */
export function createStarterPicker({ prompts = () => [], storage = globalThis.sessionStorage, random = Math.random } = {}) {
  let memory = null;
  const read = (keys) => {
    try {
      const value = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "null");
      if (value && Array.isArray(value.bag) && value.bag.every((key) => keys.has(key))) return value;
    } catch {}
    return memory && memory.bag.every((key) => keys.has(key)) ? memory : { bag: [], last: "" };
  };
  const write = (value) => {
    memory = value;
    try { storage?.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
  };
  return function pick() {
    const list = prompts();
    if (!list.length) return null;
    const state = read(new Set(list.map((preset) => preset.key)));
    if (!state.bag.length) {
      const bag = list.map((preset) => preset.key);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      // The bag is consumed from the end; keep the next pick different from the last one.
      if (bag.length > 1 && bag[bag.length - 1] === state.last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      state.bag = bag;
    }
    const key = state.bag.pop();
    write({ bag: state.bag, last: key });
    const preset = list.find((item) => item.key === key);
    return { id: preset.key, type: preset.mediaType, text: preset.prompt };
  };
}

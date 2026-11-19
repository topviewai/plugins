/**
 * Homepage copy (scene cards, image categories, 探索想法, starter prompts) is operated in the
 * Topview ops console and served already localized; the runtime only keeps flow config.
 */
const KINDS = new Set(["video_scene", "image_category", "starter"]);
const LOAD_TIMEOUT_MS = 8000;

const text = (value) => (typeof value === "string" ? value.trim() : "");

function normalizeIdea(raw) {
  const key = text(raw?.key);
  const prompt = text(raw?.prompt);
  if (!key || !prompt) return null;
  const mediaType = raw.mediaType === "image" || raw.mediaType === "video" ? raw.mediaType : "";
  return {
    key,
    title: text(raw.title),
    description: text(raw.description),
    prompt,
    skillName: text(raw.skillName),
    mediaType,
  };
}

/** Drops malformed entries instead of failing the whole homepage. */
export function normalizeHomeContent(raw) {
  const sections = [];
  for (const item of Array.isArray(raw?.sections) ? raw.sections : []) {
    const key = text(item?.key);
    if (!key || !KINDS.has(item.kind)) continue;
    const ideas = (Array.isArray(item.ideas) ? item.ideas : []).map(normalizeIdea).filter(Boolean);
    sections.push({
      key,
      kind: item.kind,
      title: text(item.title),
      description: text(item.description),
      coverUrl: /^https:\/\//.test(text(item.coverUrl)) ? text(item.coverUrl) : "",
      ideas,
    });
  }
  const byKind = (kind) => sections.filter((section) => section.kind === kind);
  return {
    videoScenes: byKind("video_scene"),
    imageCategories: byKind("image_category").filter((section) => section.title),
    starters: byKind("starter").flatMap((section) => section.ideas).filter((idea) => idea.mediaType),
    section: (key) => sections.find((section) => section.key === key) || null,
  };
}

// The Browser host installs services on iframe load, which can follow module evaluation.
function installedServices(target) {
  if (typeof target.topviewHomeServices?.getHomeContent === "function") return Promise.resolve(target.topviewHomeServices);
  return new Promise((resolve) => {
    target.addEventListener("topview:services-installed", () => resolve(target.topviewHomeServices), { once: true });
  });
}

export async function loadHomeContent(locale, { target = globalThis, timeoutMs = LOAD_TIMEOUT_MS } = {}) {
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Home content timed out")), timeoutMs);
    });
    const services = await Promise.race([installedServices(target), timeout]);
    return normalizeHomeContent(await Promise.race([services.getHomeContent(locale), timeout]));
  } catch {
    return normalizeHomeContent(null);
  } finally {
    clearTimeout(timer);
  }
}

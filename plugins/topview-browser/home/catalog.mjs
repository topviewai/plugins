import { homeError } from "./errors.mjs";
import { t } from "./locale.mjs";
const aliases = {
  "UGC-Ads-Video": "catalog.alias.ugcAd",
  "custom-ecom-tvc-product-ad": "catalog.alias.tvcProductAd",
  "micro-drama-ad-creator": "catalog.alias.shortDramaAd",
  "deadpan-ad-creator": "catalog.alias.deadpanAd",
  "poster-awakening": "catalog.alias.posterMotion",
  "motion-video-design": "catalog.alias.motionDesign",
  "video-recast": "catalog.alias.videoEditing",
  "Fast-Product-Demo-Video": "catalog.alias.quickProductDemo",
  "custom-ecom-unboxing-demo": "catalog.alias.unboxingAd",
  "short-drama-pipeline": "catalog.alias.shortDramaPipeline",
  "film-poster-design": "catalog.alias.filmPoster",
  "immersive-handheld": "catalog.alias.immersiveHandheld",
};

export function libraryScenes(items, category) {
  if (!["marketing", "film", "drama"].includes(category) || !Array.isArray(items)) {
    throw homeError("catalog.invalidList");
  }
  const seen = new Set();
  return items
    .filter((item) => {
      if (
        !item ||
        typeof item.id !== "string" ||
        !item.id.trim() ||
        typeof item.skillName !== "string" ||
        !item.skillName.trim() ||
        !["official", "community"].includes(item.source) ||
        !Array.isArray(item.tags) ||
        !item.tags.includes(category) ||
        seen.has(item.id)
      )
        return false;
      seen.add(item.id);
      return true;
    })
    .map((item) => {
      const alias = t(aliases[item.skillName] || "");
      // Covers from an authorized live response may expire; never persist signed URLs.
      const cover =
        typeof item.coverImageUrl === "string" &&
        /^https:\/\//.test(item.coverImageUrl)
          ? item.coverImageUrl
          : null;
      return {
        id: `${category}:${item.id}`,
        group: category,
        name: item.name || item.skillName,
        alias,
        desc: item.description || alias,
        sourceSkillId: item.id,
        sourceSkillName: item.skillName,
        sourceSkillType: item.source,
        skill: "canvas-agent-workflows",
        route: "skill-creation",
        prompt: `Use skill: ${item.skillName}`,
        reply: t("motion.selectedStyle", { style: item.name || item.skillName }),
        hint: item.description || "",
        coverImageUrl: cover,
      };
    });
}

export function searchLibrary(scenes, query = "", limit = 24) {
  const text = query.toLocaleLowerCase().trim();
  const filtered = scenes.filter((s) =>
    [s.name, s.alias, s.desc, s.sourceSkillName]
      .join(" ")
      .toLocaleLowerCase()
      .includes(text),
  );
  return {
    items: filtered.slice(0, limit),
    total: filtered.length,
    hasMore: filtered.length > limit,
  };
}

// User-facing examples describe the task; canonical Skill instructions stay in task context.
export function skillTrialPrompt(scene) {
  const name = scene.sourceSkillName.toLowerCase();
  if (/micro-drama|deadpan/.test(name))
    return t("catalog.trial.shortDramaAd");
  if (/motion|typography|logo/.test(name))
    return t("catalog.trial.appLaunch");
  if (/recast|editing|replic|awakening/.test(name))
    return t("catalog.trial.other");
  if (/poster/.test(name))
    return t("catalog.trial.filmPoster");
  if (/short-drama|scriptwriter|screenplay/.test(name))
    return t("catalog.trial.drama");
  if (scene.group === "marketing")
    return t("catalog.trial.marketing");
  return t("catalog.trial.film");
}

// Images are served by the frontend CDN under plugin/codex-home/. Keys carry a content hash: upload a new object for every image change.
const CDN = "https://topview-frontend.topviewai.app/plugin/codex-home/";

export const CDN_ASSETS = Object.freeze({
  topviewIcon: CDN + "topview-icon.ff14d51e26.png",
  openaiMark: CDN + "openai-white.c63c8da8ee.svg",
  skillCoverUnavailable: CDN + "skill-cover-unavailable.1263d9e7da.svg",
  marketingCollage: CDN + "marketing-creative-collage.255df9a42b.webp",
  filmProductionSource: CDN + "film-production-source.a74e464ffa.webp",
  motionStudioCardBg: CDN + "motion-studio-card-bg.ad81149054.webp",
});

const SCENARIO_COVERS = Object.freeze({
  drama: CDN + "scenarios/drama.47c081fc3e.webp",
  edit: CDN + "scenarios/edit.eee8ad3a99.webp",
  image: CDN + "scenarios/image.9174a1228e.webp",
  product: CDN + "scenarios/product.c5a42f4f6d.webp",
  replicate: CDN + "scenarios/replicate.d55fe6d949.webp",
  social: CDN + "scenarios/social.14c3abc02e.webp",
  story: CDN + "scenarios/story.7012f605ec.webp",
  timeline: CDN + "scenarios/timeline.cc08e48a6c.webp",
});

export function scenarioCover(id) {
  return Object.hasOwn(SCENARIO_COVERS, id) ? SCENARIO_COVERS[id] : CDN_ASSETS.skillCoverUnavailable;
}

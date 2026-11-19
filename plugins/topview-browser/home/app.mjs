import { homeError, localizeHomeError } from "./errors.mjs";
import { language, localeReady, t, translateScene } from "./locale.mjs";
import {
  resolveQuickStart,
  ideaBatch,
  createBatchPicker,
  IDEA_BATCH_SIZE,
} from "./quick-starts.mjs";
import { loadHomeContent } from "./home-content.mjs";
import { libraryScenes, searchLibrary, skillTrialPrompt } from "./catalog.mjs";
import { CDN_ASSETS, scenarioCover } from "./cdn-assets.mjs";
import { createHomeClient } from "./services.mjs";
import { createCreditCache } from "./credits.mjs";
import { createStarterPicker } from "./starter-prompts.mjs";
await localeReady;
const client = createHomeClient(() => window.topviewHomeServices);

TopviewHomeTheme.connect(window.topviewHomeServices);
const $ = (s) => document.querySelector(s),
  $$ = (s) => document.querySelectorAll(s);
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#${name}"/></svg>`;
const projectErrorDialog = $("#project-error-dialog");
const reauthorizeGuide = $("#project-reauthorize-guide");
const projectAuthorizationErrors = new Set(["AUTHORIZATION_REQUIRED", "ACCOUNT_MISMATCH", "PLUGIN_CONNECTION_REQUIRED"]);
let projectErrorTrigger;

projectErrorDialog.addEventListener("close", () => projectErrorTrigger?.focus());

function showProjectOpenError(error, trigger) {
  const needsAuthorization = projectAuthorizationErrors.has(error?.code);
  projectErrorTrigger = trigger;
  $("#project-error-title").textContent = t("projectOpen.failedTitle");
  $("#project-error-message").textContent = needsAuthorization
    ? localizeHomeError(error, { scope: "project-open" })
    : t("projectOpen.pageFailed");
  $("#project-error-confirm").textContent = t("projectOpen.confirm");
  $("#project-error-close").setAttribute("aria-label", t("projectOpen.close"));
  reauthorizeGuide.textContent = t("projectOpen.reauthorizeGuide");
  reauthorizeGuide.hidden = !needsAuthorization;
  if (!projectErrorDialog.open) projectErrorDialog.showModal();
}

const [scenarios, homeContent] = await Promise.all([
  fetch(new URL("./scenarios.json", import.meta.url)).then((r) => {
    if (!r.ok) throw homeError("workbench.sceneConfigFailed");
    return r.json().then(items => items.map(translateScene));
  }),
  loadHomeContent(language),
]);
// Operated copy replaces the bundled scene card name/description; flow config stays local.
for (const section of homeContent.videoScenes) {
  const scene = scenarios.find((s) => s.id === section.key && s.group === "create");
  if (!scene) continue;
  if (section.title) scene.name = section.title;
  if (section.description) scene.desc = section.description;
  if (section.coverUrl) scene.coverUrl = section.coverUrl;
}
const sceneCover = (scene) => scene.coverUrl || scenarioCover(scene.id);
const quickScenes = () => homeContent.videoScenes
  .filter((section) => section.ideas.length && scenarios.some((s) => s.id === section.key && s.group === "create"));
const hasQuickStart = (type) => type === "image"
  ? homeContent.imageCategories.some((category) => category.ideas.length)
  : quickScenes().some((section) => section.key === type);

// Runtime entries always come from the current account/environment's skill API.
let liveCatalog = [];
const libraries = { marketing: [], film: [], drama: [] };
let quickType = null;
let imageCategory = homeContent.imageCategories[0]?.key || "";
let libraryService;
let libraryLoad;
let libraryStatus = "idle";
function isLibrary(g = group) {
  return ["film", "marketing", "drama"].includes(g);
}
function findScene(id) {
  return (
    scenarios.find((s) => s.id === id) ||
    Object.values(libraries)
      .flat()
      .find((s) => s.id === id)
  );
}
function loadLibrary() {
  const service = window.topviewHomeServices;
  if (typeof service?.listSkills !== "function") return;
  if (libraryService !== service) {
    libraryService = service;
    libraryLoad = undefined;
    libraryStatus = "idle";
    liveCatalog = [];
    for (const category of Object.keys(libraries)) libraries[category] = [];
  }
  if (libraryLoad) return libraryLoad;

  libraryStatus = "loading";
  libraryLoad = Promise.resolve().then(() => service.listSkills({})).then((items) => {
    if (libraryService !== service) return;
    for (const category of Object.keys(libraries)) {
      libraries[category] = libraryScenes(items, category);
      for (const scene of libraries[category].slice(0, 4)) {
        if (!scene.coverImageUrl) continue;
        const cover = new Image();
        cover.fetchPriority = "low";
        cover.src = scene.coverImageUrl;
      }
    }
    liveCatalog = items;
    libraryStatus = "ready";
  }).catch((error) => {
    if (libraryService === service) {
      libraryStatus = "error";
      libraryLoad = undefined;
    }
    throw error;
  }).finally(() => {
    if (libraryService === service && isLibrary() && !$("#scene-panel").hidden)
      renderSceneGrid($("#skill-search").value);
  });
  return libraryLoad;
}

function refreshLibrary() {
  void loadLibrary()?.catch(() => {});
}
let active = null,
  group = "create",
  files = [],
  messages = [],
  lastFocus = null,
  projectBrowser = null,
  busy = false;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function art(s) {
  const fallback = CDN_ASSETS.skillCoverUnavailable;
  return `<img loading="lazy" src="${esc(s.coverImageUrl || fallback)}" alt="${esc(s.name)}" data-cover-fallback="${esc(fallback)}">`;
}
function sizeLibraryViewport() {
  const grid = $("#scene-grid");
  if (!isLibrary()) return;
  const first = grid.querySelector(".scene");
  if (!first) return;
  const row = (first.getBoundingClientRect().width * 9) / 16 + 52;
  const style = getComputedStyle(grid);
  const gap = parseFloat(style.rowGap) || 0;
  const padding =
    (parseFloat(style.paddingTop) || 0) +
    (parseFloat(style.paddingBottom) || 0);
  const twoRows = row * 2 + gap + padding;
  grid.style.setProperty("--skill-row-height", `${row}px`);
  grid.style.setProperty(
    "--skill-viewport-height",
    `${Math.min(twoRows, Math.max(240, window.innerHeight - 300))}px`,
  );
}
let releaseToastDialog = () => {};
function toast(message) {
  const node = $("#toast");
  const hasPopover = typeof node.showPopover === "function" && typeof node.hidePopover === "function";
  if (hasPopover) node.setAttribute("popover", "manual");
  else node.removeAttribute("popover");
  const hideLayer = () => {
    if (hasPopover && node.matches(":popover-open")) node.hidePopover();
  };
  const present = () => {
    releaseToastDialog();
    hideLayer();
    // A manual popover enters the native top layer without moving keyboard focus.
    // Keep the live region inside an open dialog so it is not made inert by showModal().
    const dialog = document.querySelector("dialog[open]");
    (dialog || document.body).append(node);
    node.toggleAttribute("data-dialog-fallback", Boolean(dialog) && !hasPopover);
    if (hasPopover) node.showPopover();
    if (dialog) {
      const onClose = () => {
        if (node.classList.contains("show")) present();
      };
      dialog.addEventListener("close", onClose, { once: true });
      releaseToastDialog = () => {
        dialog.removeEventListener("close", onClose);
        releaseToastDialog = () => {};
      };
    }
  };
  node.textContent = message;
  node.classList.add("show");
  present();
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    releaseToastDialog();
    node.classList.remove("show");
    hideLayer();
    node.removeAttribute("data-dialog-fallback");
    document.body.append(node);
  }, 2600);
}
// The scene picker is a modal over the homepage (same shell as Motion Studio), so home stays mounted.
function showWorkbench() {
  if (!$("#workbench").classList.contains("visible")) lastFocus = document.activeElement;
  $("#workbench").classList.add("visible");
}
function renderSceneGrid(query = "") {
  const library = isLibrary();
  const grid = $("#scene-grid");
  if (library && libraryStatus !== "ready") {
    const failed = libraryStatus === "error";
    grid.setAttribute("aria-label", t("workbench.sceneList"));
    grid.setAttribute("aria-busy", String(!failed));
    grid.innerHTML = failed
      ? `<p class="no-skills" role="status">${esc(t("workbench.scenesFailed"))} <button type="button" data-retry-library>${esc(t("errors.retry"))}</button></p>`
      : `<p class="no-skills library-loading" role="status">${esc(t("workbench.loadingScenes"))}</p>` +
        '<div class="library-placeholder" aria-hidden="true"></div>'.repeat(6);
    grid.querySelector("[data-retry-library]")?.addEventListener("click", () => {
      refreshLibrary();
      renderSceneGrid($("#skill-search").value);
    });
    sizeLibraryViewport();
    return;
  }
  grid.removeAttribute("aria-busy");
  const result = searchLibrary(
    library
      ? libraries[group]
      : scenarios.filter((s) => s.group === group && s.id !== "image"),
    query,
    library ? Infinity : 24,
  );
  $("#scene-grid").innerHTML =
    result.items
      .map(
        (s) =>
          `<button class="scene ${library ? "film-skill" : ""}" data-scenario="${esc(s.id)}"><div class="scene-picture">${library ? art(s) : `<img class="scene-template-cover" src="${esc(sceneCover(s))}" alt="${esc(s.name)} · ${esc(t("workbench.photoCollage"))}" loading="lazy">`}${library ? `<span class="skill-use">${esc(t("workbench.useScene"))} ↗</span>` : ""}</div><div class="scene-name">${esc(s.name)}<span>↗</span></div>${library ? "" : `<p class="scene-description" title="${esc(s.desc)}">${esc(s.desc)}</p>`}</button>`,
      )
      .join("") || `<p class="no-skills">${esc(t("workbench.noMatches"))}</p>`;

  $("#scene-grid").setAttribute(
    "aria-label",
    library ? t("workbench.sceneList") : t("workbench.creationScenes"),
  );
  $("#scene-grid").tabIndex = library ? 0 : -1;
  sizeLibraryViewport();
}
function gallery(g = "create") {
  if (!$("#workbench").classList.contains("visible")) {
    active = null;
    messages = [];
    $("#selected-bar").classList.remove("visible");
    $("#prompt").value = "";
    $("#prompt").placeholder = t("workbench.promptPlaceholder");
    renderChat();
    syncSend();
  }
  quickType = null;
  $("#quick-explorer").hidden = true;
  $("#scene-grid").hidden = false;
  $("#composer").classList.remove("has-preset");
  group = g;
  showWorkbench();
  $("#scene-panel").hidden = false;
  $("#scene-panel").classList.toggle("film-library", isLibrary(g));
  $("#conversation").classList.remove("visible");
  $("#gallery-title").textContent =
    g === "marketing" ? t("home.marketing.title") : g === "film" ? t("home.film.title") : g === "drama" ? t("workbench.dramaTitle") : t("hero.video.title");
  $("#library-tools").hidden = !isLibrary(g);
  $("#skill-search").value = "";
  $("#scene-grid").scrollTop = 0;
  $("#skill-search").placeholder = "";
  $("#skill-search").setAttribute(
    "aria-label",
    g === "marketing" ? t("workbench.searchMarketing") : g === "drama" ? t("workbench.searchDrama") : t("workbench.searchFilm"),
  );
  if (isLibrary(g)) refreshLibrary();
  renderSceneGrid();
  $("#scene-grid button")?.focus();
}
async function addToCodex(prompt, selectedFiles = [], { successMessage } = {}) {
  if (busy) return false;
  busy = true;
  syncSend();
  try {
    const service = window.topviewHomeServices;
    if (typeof service?.composeDraft !== 'function') throw homeError("composer.openFromSidebar");
    await service.composeDraft({ prompt, files: selectedFiles });
    toast(successMessage || t("composer.addedReview"));
    return true;
  } catch (error) {
    toast(localizeHomeError(error, { fallback: "composer.addFailed", scope: "compose-draft" }));
    return false;
  } finally {
    busy = false;
    syncSend();
  }
}
// A library skill's scene.prompt names the skill ID, which must never reach the Codex composer.
function draftScene(scene, prompt) {
  return prompt || (scene.sourceSkillName ? "" : scene.prompt) || t("workbench.defaultDraft", { scene: scene.name });
}
function choose(id) {
  if (busy) return;
  if (id === "drama") { gallery("drama"); return; }
  const next = findScene(id);
  if (!next) return;
  if (next.group === "create" && hasQuickStart(next.id)) {
    openQuickStart(next.id);
    return;
  }
  if (next.gallery) {
    gallery(next.gallery);
    return;
  }
  active = next;
  group = active.group;
  if (!isLibrary(active.group)) showWorkbench();
  $("#scene-panel").hidden = !isLibrary(active.group);
  $("#selected-label").textContent =
    (active.sourceSkillName ? "@ " : "") + active.name;
  $("#selected-bar").classList.remove("visible");
  messages = [];
  $$("#scene-grid [data-scenario]").forEach((card) => {
    card.setAttribute(
      "aria-pressed",
      "false",
    );
  });
  renderChat();
  $("#prompt").placeholder =
    active.id === "story"
      ? t("workbench.promptPlaceholderStory")
      : t("workbench.promptPlaceholderScene");
  $("#prompt").value = isLibrary(active.group) ? skillTrialPrompt(active) : "";
  $("#composer").classList.toggle("has-preset", isLibrary(active.group));
  syncSend();
  void addToCodex(draftScene(active, $("#prompt").value));
  window.dispatchEvent(
    new CustomEvent("topview:scenario-selected", {
      detail: {
        scenarioId: active.id,
        skill: active.skill,
        workflow: active.route,
        prompt: active.prompt,
        skillPolicy: active.launchPolicy ?? null,
        skillReference: active.sourceSkillName
          ? {
              source: isLibrary(active.group)
                ? `main-site-${active.group}-library`
                : "main-site-skill-reference",
              name: active.sourceSkillName,
              id: active.sourceSkillId,
              sourceType: active.sourceSkillType,
              resolution: active.sourceSkillId
                ? "verified-catalog-reference"
                : "name-reference-only",
            }
          : null,
      },
    }),
  );
}
// 探索想法: about 15 examples per scene, shown three at a time; 换一批 moves to another batch.
const ideaBatches = createBatchPicker();
const ideaScene = (type) => (type === "image" ? `image:${imageCategory}` : type);
function currentIdeaPool(type) {
  return homeContent.section(type === "image" ? imageCategory : type)?.ideas || [];
}
function renderIdeas(type) {
  const pool = currentIdeaPool(type);
  const count = Math.ceil(pool.length / IDEA_BATCH_SIZE);
  const index = Math.min(ideaBatches.current(ideaScene(type)), Math.max(0, count - 1));
  $("#quick-ideas").innerHTML = ideaBatch(pool, index)
    .map(
      (p) =>
        `<button type="button" class="quick-idea" data-quick-preset="${esc(p.key)}" aria-pressed="${false}"><span class="idea-icon">${icon("spark", 20)}</span><strong>${esc(p.title)}</strong><span class="idea-meta">${esc(p.description)}</span><span class="idea-prompt"><span>${esc(p.prompt)}</span></span></button>`,
    )
    .join("");
  // A scene with one batch has nothing to swap to.
  $("#quick-shuffle").hidden = pool.length <= IDEA_BATCH_SIZE;
}
let shuffleTimer;
$("#quick-shuffle").onclick = () => {
  const type = quickType;
  if (!type || busy) return;
  const pool = currentIdeaPool(type);
  ideaBatches.next(ideaScene(type), Math.ceil(pool.length / IDEA_BATCH_SIZE));
  const ideas = $("#quick-ideas");
  const button = $("#quick-shuffle");
  button.classList.remove("is-spinning");
  void button.offsetWidth; // restart the icon turn on rapid clicks
  button.classList.add("is-spinning");
  clearTimeout(shuffleTimer);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { renderIdeas(type); return; }
  ideas.classList.add("is-swapping");
  shuffleTimer = setTimeout(() => {
    if (quickType !== type) return;
    renderIdeas(type);
    ideas.classList.remove("is-swapping");
  }, 140);
};

const quickTrack = $("#quick-types");
const quickRail = quickTrack.parentElement;
const quickLeft = $(".quick-rail-left");
const quickRight = $(".quick-rail-right");

function moveQuickRail(direction) {
  const card = quickTrack.firstElementChild;
  if (!card) return;
  const gap = parseFloat(getComputedStyle(quickTrack).columnGap) || 0;
  const step = card.getBoundingClientRect().width + gap;
  const page = Math.max(1, Math.floor(quickTrack.clientWidth / step));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  quickTrack.scrollBy({ left: direction * step * page, behavior: reducedMotion ? "instant" : "smooth" });
}

quickLeft.onclick = () => moveQuickRail(-1);
quickRight.onclick = () => moveQuickRail(1);

function syncQuickScroll() {
  const max = quickTrack.scrollWidth - quickTrack.clientWidth;
  const rtl = getComputedStyle(quickTrack).direction === "rtl";
  const offset = Math.min(max, Math.abs(quickTrack.scrollLeft));
  const canGoBack = offset > 1;
  const canGoForward = max - offset > 1;
  quickRail.classList.toggle("can-scroll-left", rtl ? canGoForward : canGoBack);
  quickRail.classList.toggle("can-scroll-right", rtl ? canGoBack : canGoForward);
  for (const [button, canScroll] of [[quickLeft, rtl ? canGoForward : canGoBack], [quickRight, rtl ? canGoBack : canGoForward]]) {
    if (!canScroll && document.activeElement === button) quickTrack.focus({ preventScroll: true });
    button.hidden = !canScroll;
  }
}
quickTrack.addEventListener("scroll", syncQuickScroll, { passive: true });
window.addEventListener("resize", syncQuickScroll);
function openQuickStart(type, category = homeContent.imageCategories[0]?.key) {
  if (busy || !hasQuickStart(type)) return;
  clearTimeout(shuffleTimer);
  $("#quick-ideas").classList.remove("is-swapping");
  quickType = type;
  if (type === "image") imageCategory = category;
  active = null;
  group = "create";
  showWorkbench();
  $("#scene-panel").hidden = false;
  $("#scene-panel").classList.remove("film-library");
  $("#scene-grid").hidden = true;
  $("#library-tools").hidden = true;
  $("#quick-explorer").hidden = false;
  $("#gallery-title").textContent = t(type === "image" ? "hero.image.title" : "hero.video.title");
  const isImage = type === "image";
  const selectedId = isImage ? imageCategory : type;
  const dataset = isImage ? "data-image-category" : "data-quick-type";
  const cards = (isImage ? homeContent.imageCategories : quickScenes())
    .map((section) => ({ id: section.key, name: section.title || findScene(section.key)?.name || "", coverUrl: section.coverUrl || scenarioCover(section.key) }));
  const rtl = getComputedStyle(quickTrack).direction === "rtl";
  quickLeft.setAttribute("aria-label", t(rtl ? "workbench.nextType" : "workbench.previousType"));
  quickRight.setAttribute("aria-label", t(rtl ? "workbench.previousType" : "workbench.nextType"));
  quickTrack.innerHTML = cards
    .map(
      ({ id, name, coverUrl }) =>
        `<button type="button" class="quick-type" ${dataset}="${esc(id)}" aria-pressed="${id === selectedId}"><img src="${esc(coverUrl)}" alt=""><span>${esc(name)}</span></button>`,
    )
    .join("");
  renderIdeas(type);
  syncQuickScroll();
  messages = [];
  renderChat();
  $("#selected-bar").classList.remove("visible");
  $("#composer").classList.remove("has-preset");
  $("#prompt").value = "";
  syncSend();
  $("#quick-types [aria-pressed=true]")?.scrollIntoView({
    block: "nearest",
    inline: "nearest",
  });
}
async function applyQuickPreset(type, presetId) {
  if (busy) return;
  let scene;
  try {
    const preset = currentIdeaPool(type).find((item) => item.key === presetId);
    if (preset?.skillName) {
      if (typeof window.topviewHomeServices?.listSkills !== "function")
        throw homeError("composer.connectBeforeSkill");
      await loadLibrary();
    }
    scene = resolveQuickStart(scenarios, liveCatalog, type, preset, findScene(type)?.name);
  } catch (error) {
    toast(localizeHomeError(error, { scope: "compose-draft" }));
    return;
  }
  if (quickType !== type || $("#quick-explorer").hidden) return;
  messages = [];
  renderChat();
  active = scene;
  $("#selected-label").textContent = scene.name;
  $("#selected-bar").classList.remove("visible");
  $("#composer").classList.add("has-preset");
  $("#prompt").value = scene.prompt;
  syncSend();
  void addToCodex(draftScene(scene, scene.prompt));
  window.dispatchEvent(
    new CustomEvent("topview:scenario-selected", {
      detail: {
        scenarioId: scene.id,
        presetId: scene.presetId,
        workflow: scene.route,
        prompt: scene.prompt,
        skillReference: scene.sourceSkillName
          ? {
              id: scene.sourceSkillId,
              name: scene.sourceSkillName,
              sourceType: scene.sourceSkillType,
            }
          : null,
      },
    }),
  );
}
function renderChat() {
  $("#conversation").classList.toggle("visible", messages.length > 0);
  $("#conversation").innerHTML = messages
    .map((m) =>
      m.role === "user"
        ? `<div class="user-message">${esc(m.text)}</div>`
        : `<div class="assistant-message"><div class="assistant-body">${m.role === "guide" ? `<span class="context-chip">${esc(t("workbench.guideChip"))} · ${esc(active?.name || "")}</span>` : ""}<p>${esc(m.text)}</p>${m.sub ? `<p class="sub">${esc(m.sub)}</p>` : ""}${m.canvasId ? `<button type="button" class="add-material" data-open-canvas="${esc(m.canvasId)}">${esc(t("workbench.openProject"))} ↗</button>` : ""}</div></div>`,
    )
    .join("");
}
// Feature flag: the 开始创作 tab and its 营销创意/影视制作 entry cards are hidden for now,
// so the home section shows only 我的项目. Set to true to restore the tab switcher and
// both entry cards; nothing else needs to change.
const SHOW_SCENE_ENTRIES = false;
const pickStarterPrompt = createStarterPicker({ prompts: () => homeContent.starters });
function renderExamples(recent = !SHOW_SCENE_ENTRIES) {
  if (!SHOW_SCENE_ENTRIES) recent = true;
  projectBrowser?.dispose();
  projectBrowser = null;
  // With a single section there is nothing to switch, and the project list carries its own title.
  $(".section-top").hidden = !SHOW_SCENE_ENTRIES;
  $("#inspiration-tab").classList.toggle("active", !recent);
  $("#recent-tab").classList.toggle("active", recent);
  $("#section-label").textContent = recent
    ? t("home.continueLabel")
    : t("home.inspirationLabel");
  $("#examples").classList.toggle("projects-view", recent);
  if (recent) {
    projectBrowser = window.TopviewHomeProjects.mount($("#examples"), {
      resourceOrigin: window.topviewHomeServices?.resourceOrigin,
      listProjects: async (options) => {
        const service = window.topviewHomeServices;
        if (typeof service?.listProjects !== "function")
          throw Object.assign(new Error("Account service not connected"), {
            code: "AUTHORIZATION_REQUIRED",
          });
        return service.listProjects(options);
      },
      // Empty account: "workbench.createNow" drops a random starter task into the Codex composer (send:false).
      // It is only filled (send:false), so the feedback says so.
      onCreate: () => addToCodex(pickStarterPrompt()?.text || "@topview ", [], { successMessage: t("composer.addedReview") }),
      onOpenError: showProjectOpenError,
      openProject: async (canvasId) => {
        const service = window.topviewHomeServices;
        if (typeof service?.openProject !== "function")
          throw Object.assign(new Error("Project opening service not connected"), { code: "AUTHORIZATION_REQUIRED" });
        return service.openProject(canvasId);
      },
    });
    return;
  }
  $("#examples").innerHTML = [
    ["product", t("home.marketing.title"), t("home.marketing.description"), t("home.marketing.title")],
    ["story", t("home.film.title"), t("home.film.description"), t("home.film.badge")],
  ]
    .map(([id, title, desc, label]) => {
      return `<button class="example" ${id === "product" ? 'data-gallery="marketing"' : 'data-gallery="film"'}><div class="cover">${id === "product" ? `<img class="home-cover" src="${CDN_ASSETS.marketingCollage}" alt="${esc(t("home.marketing.coverAlt"))}">` : `<svg class="film-production-cover" viewBox="522 90 490 276" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(t("home.film.coverAlt"))}"><image width="2048" height="1224" href="${CDN_ASSETS.filmProductionSource}"/></svg>`}<span class="badge">${icon("film", 12)}${esc(label)}</span></div><div class="example-title"><span>${esc(title)}</span><span>↗</span></div><p class="example-desc">${esc(desc)}</p></button>`;
    })
    .join("");
}
function home(recent = !SHOW_SCENE_ENTRIES) {
  const wasOpen = $("#workbench").classList.contains("visible");
  $("#home").hidden = false;
  $("#workbench").classList.remove("visible");
  if (wasOpen) lastFocus?.focus?.({ preventScroll: true });
  // Returning to an already mounted project list keeps it (no reload flash).
  if (!(recent && projectBrowser)) renderExamples(recent);
  if (!wasOpen) window.scrollTo(0, 0);
}
function syncSend() {
  $("#send").disabled = busy || (!$("#prompt").value.trim() && !files.length);
  $("#prompt").disabled = busy;
  $("#attach").disabled = busy;
  $("#change-scene").disabled = busy;
  $("#scenes-toggle").disabled = busy;
}
function updateFiles() {
  $("#attachments").innerHTML = files
    .map(
      (f, i) =>
        `<div class="file-chip">${f.url ? `<img src="${f.url}" alt="${esc(t("workbench.assetPreview"))}">` : icon("film", 22)}<span>${esc(f.file.name)}</span><button type="button" data-remove-file="${i}" aria-label="${esc(t("workbench.remove"))} ${esc(f.file.name)}">×</button></div>`,
    )
    .join("");
  syncSend();
}
function addFiles(list) {
  if (busy) return;
  const incoming = Array.from(list).filter((f) => f.size > 0 && f.size <= 50 * 1024 * 1024);
  if (incoming.length < list.length) toast(t("workbench.skippedFiles"));
  if (incoming.length > 20) { toast(t("workbench.maxFiles")); return; }
  if (incoming.length) void addToCodex('', incoming);
}

document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open-canvas]");
  if (open) {
    client
      .openProject(open.dataset.openCanvas)
      .catch((err) => toast(localizeHomeError(err, { scope: "open-navigation" })));
    return;
  }
  const imageTab = e.target.closest("[data-image-category]");
  if (imageTab) {
    openQuickStart("image", imageTab.dataset.imageCategory);
    return;
  }
  const quick = e.target.closest(
    "[data-quick-type], [data-quick-preset]",
  );
  if (quick) {
    if (busy) return;
    if (quick.dataset.quickPreset)
      void applyQuickPreset(quickType, quick.dataset.quickPreset);
    else openQuickStart(quick.dataset.quickType);
    return;
  }
  const scenario = e.target.closest("[data-scenario]");
  if (scenario) {
    choose(scenario.dataset.scenario);
    return;
  }
  const entry = e.target.closest("[data-gallery]");
  if (entry) {
    gallery(entry.dataset.gallery);
    return;
  }
  const material = e.target.closest("[data-add-material]");
  if (material) {
    $("#file-input").click();
    return;
  }
  const remove = e.target.closest("[data-remove-file]");
  if (remove) {
    if (busy) return;
    const i = +remove.dataset.removeFile;
    if (files[i].url) URL.revokeObjectURL(files[i].url);
    files.splice(i, 1);
    updateFiles();
    return;
  }
});
$("#back").onclick = () => home();
// Clicking the dimmed backdrop closes the picker like the close button.
$("#workbench").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) $("#close-gallery").click();
});
$("#close-gallery").onclick = () => {
  if (messages.length) {
    $("#scene-panel").hidden = true;
    renderChat();
    $("#prompt").focus();
  } else home();
};
$("#change-scene").onclick = () => {
  if (busy) return;
  active = null;
  $("#selected-bar").classList.remove("visible");
  $$("#scene-grid [aria-pressed]").forEach((card) =>
    card.removeAttribute("aria-pressed"),
  );
  syncSend();
};
$("#scenes-toggle").onclick = () => gallery(group);
// Clicking the tab that is already active keeps the list as is (no re-render flash).
$("#inspiration-tab").onclick = () => { if (!$("#inspiration-tab").classList.contains("active")) renderExamples(); };
$("#recent-tab").onclick = () => { if (!$("#recent-tab").classList.contains("active")) renderExamples(true); };
$("#attach").onclick = () => $("#file-input").click();
$("#file-input").onchange = (e) => {
  addFiles(e.target.files);
  e.target.value = "";
};
$("#prompt").oninput = syncSend;
// The native host owns editing and sending. Never create a second agent conversation.
$("#composer").onsubmit = (event) => event.preventDefault();

async function openPricing() {
  await client.openPricing();
}
const accountMenu = TopviewAccountMenu.bind({
  container: $(".account-menu"),
  button: $("#avatar-button"),
  popover: $("#credits-card"),
  rechargeButton: $("#credits-recharge"),
  onRecharge: openPricing,
  onError: () => toast(t("composer.pricingUnavailable")),
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());
$("#skill-search").oninput = (e) => {
  $("#scene-grid").scrollTop = 0;
  renderSceneGrid(e.target.value);
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("#workbench").classList.contains("visible")) {
    if (!$("#scene-panel").hidden && messages.length) {
      $("#scene-panel").hidden = true;
      renderChat();
      $("#prompt").focus();
    } else {
      home();
      lastFocus?.focus();
    }
  }
});
renderExamples();

// Balance: render the last known value immediately and revalidate silently.
// Previously every hover reset the amount to "—" before re-fetching, which flashed.
const creditFormat = new Intl.NumberFormat(language, { maximumFractionDigits: 2 });
const credits = createCreditCache({
  load: () => client.getCredits(),
  onChange(value, state) {
    const amount = $("[data-credit-amount]");
    const text = state === "ready" ? creditFormat.format(value) : state === "unavailable" ? "—" : "";
    if (amount.textContent !== text) amount.textContent = text;
    amount.dataset.state = state;
    amount.toggleAttribute("aria-busy", state === "loading");
  },
});
const refreshCredits = () => void credits.refresh();
$("#avatar-button").addEventListener("pointerenter", refreshCredits);
$("#avatar-button").addEventListener("focus", refreshCredits);
window.addEventListener("topview:services-ready", () => {
  TopviewHomeTheme.connect(window.topviewHomeServices);
  void credits.refresh({ force: true });
  refreshLibrary();
  if ($("#recent-tab").classList.contains("active")) renderExamples(true);
});
if (window.topviewHomeServices) {
  refreshLibrary();
  void credits.refresh();
}
window.addEventListener("beforeunload", () => {
  projectBrowser?.dispose();
  accountMenu?.dispose?.();
  files.forEach((f) => {
    if (f.url) URL.revokeObjectURL(f.url);
  });
});

document.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (img instanceof HTMLImageElement && img.dataset.coverFallback) {
      const fallback = img.dataset.coverFallback;
      if (fallback === CDN_ASSETS.skillCoverUnavailable)
        delete img.dataset.coverFallback;
      else img.dataset.coverFallback = CDN_ASSETS.skillCoverUnavailable;
      img.src = fallback;
    }
  },
  true,
);

new ResizeObserver(sizeLibraryViewport).observe($("#scene-grid"));
window.addEventListener("resize", sizeLibraryViewport);

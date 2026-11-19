import { createMotionPreviewCache, motionPreviewSource } from "./motion-preview-cache.mjs";
import { homeError, localizeHomeError } from "./errors.mjs";
import { formatDuration } from "./format.mjs";
import { localeReady, t } from "./locale.mjs";
import { MOTION_MAX_ASSETS, mergeMotionFiles, motionAssetHint, motionAssetRange, motionReadiness, nextTabIndex } from "./motion-studio-model.mjs";
await localeReady;
const dialog = document.querySelector("#motion-studio");
const openButton = document.querySelector("#motion-open");
const tabs = dialog.querySelector(".motion-tabs");
const gallery = dialog.querySelector(".motion-gallery");
const cards = dialog.querySelector(".motion-cards");
const form = dialog.querySelector("form");
const notice = dialog.querySelector(".motion-notice");
const submit = form.querySelector(".motion-submit");
const submitLabel = submit.querySelector(".motion-submit-label");
const retry = dialog.querySelector(".motion-retry");
const reference = dialog.querySelector(".motion-reference");
const referenceTile = dialog.querySelector(".motion-reference-tile");
const selected = dialog.querySelector(".motion-selection");
const thumbnail = dialog.querySelector(".motion-thumbnail");
const clear = dialog.querySelector(".motion-clear");
const ratioTrigger = form.querySelector(".motion-ratio");
const ratioLabel = form.querySelector("#motion-ratio-value");
const ratioMenu = form.querySelector("#motion-ratio-menu");
const ratioOptions = [...ratioMenu.querySelectorAll("[data-ratio]")];
const durationLabel = form.querySelector("output");
const fileList = dialog.querySelector(".motion-files");
const assetHint = dialog.querySelector(".motion-asset-hint");
const fallback = dialog.querySelector(".motion-copy-fallback");
const addFiles = dialog.querySelector(".motion-add");
const addFilesTip = t("motion.addAssetsHint");
let catalog;
let category = "All";
let template;
let pending = false;
let files = [];
let copiedTimer;
// True after this exact brief was filled into Codex; any edit re-enables submit.
let filled = false;
const previews = new Map();
const categoryLabels = new Map([
  ["All", t("motion.category.all")], ["Explainer", t("motion.category.explainer")], ["Shorts", t("motion.category.shorts")],
  ["Motion Graphics", t("motion.category.motionGraphics")], ["Product Launch", t("motion.category.productLaunch")],
  ["Animated Stories", t("motion.category.animatedStories")], ["3D", t("motion.category.3d")],
]);
const copyMode = () => form.elements.agent.value === "other";
const say = ([key, values]) => t(key, values);

function setNotice(text = "", tone = "") {
  notice.textContent = text;
  notice.dataset.tone = tone;
}

/** Recompute submit state, its label and the hint that explains what is missing. */
function sync() {
  const state = motionReadiness({ template, idea: form.elements.idea.value, assets: files.length });
  const range = motionAssetRange(template);
  submit.disabled = pending || filled || !state.ready;
  submit.dataset.done = String(filled || Boolean(submit.dataset.copied));
  if (filled) submitLabel.textContent = t("composer.added");
  else if (!submit.dataset.copied) submitLabel.textContent = copyMode() ? t("motion.copyPrompt") : t("composer.addToCodex");
  submit.dataset.mode = copyMode() ? "copy" : "codex";
  // The count rule lives on the + button (tooltip + description) and only shows inline when it blocks submit.
  const rule = template ? say(motionAssetHint(range)) : "";
  assetHint.textContent = state.assets ? say(state.reason) : "";
  assetHint.dataset.invalid = String(Boolean(state.assets));
  addFiles.title = rule ? `${addFilesTip}\n${rule}` : addFilesTip;
  const reason = !template || state.ready || state.assets ? "" : say(state.reason);
  if (!notice.dataset.tone || notice.dataset.tone === "hint") setNotice(reason, reason ? "hint" : "");
}

function resetFeedback() {
  filled = false;
  fallback.hidden = true;
  clearTimeout(copiedTimer);
  delete submit.dataset.copied;
  if (notice.dataset.tone !== "hint") setNotice();
}

function updateReference(item) {
  template = item;
  reference.dataset.empty = String(!item);
  selected.hidden = !item;
  selected.textContent = item?.label || "";
  selected.title = item?.label || "";
  referenceTile.setAttribute("aria-label", item ? t("motion.changeStyle", { style: item.label }) : t("motion.pickStyleFirst"));
  referenceTile.title = item?.label || "";
  thumbnail.hidden = !item?.poster;
  if (item?.poster) thumbnail.src = item.poster;
  else thumbnail.removeAttribute("src");
  setRatio(item?.ratio);
  form.elements.duration.value = item?.duration ? Math.min(60, Math.max(5, Math.round(item.duration))) : 30;
  syncDuration();
  resetFeedback();
  setNotice();
  for (const card of cards.children) card.setAttribute("aria-pressed", String(card.dataset.templateId === item?.id));
  sync();
}

function setRatio(value = "16:9") {
  const ratio = ratioOptions.some((option) => option.dataset.ratio === value) ? value : "16:9";
  form.elements.ratio.value = ratio;
  ratioLabel.textContent = ratio;
  for (const option of ratioOptions) {
    option.setAttribute("aria-checked", String(option.dataset.ratio === ratio));
  }
}

function positionRatioMenu() {
  const anchor = ratioTrigger.getBoundingClientRect();
  const edge = 8;
  const gap = 4;
  const below = window.innerHeight - anchor.bottom - edge - gap;
  const above = anchor.top - edge - gap;
  const height = ratioMenu.scrollHeight + 2;
  const opensAbove = below < height && above > below;
  const maxHeight = Math.max(0, opensAbove ? above : below);
  const start = getComputedStyle(ratioTrigger).direction === "rtl" ? anchor.right - ratioMenu.offsetWidth : anchor.left;
  ratioMenu.style.maxHeight = `${maxHeight}px`;
  ratioMenu.style.left = `${Math.max(edge, Math.min(start, window.innerWidth - ratioMenu.offsetWidth - edge))}px`;
  ratioMenu.style.top = `${opensAbove ? anchor.top - gap - Math.min(height, maxHeight) : anchor.bottom + gap}px`;
}

ratioMenu.addEventListener("toggle", (event) => {
  if (event.newState !== "open") return;
  positionRatioMenu();
  ratioMenu.querySelector('[aria-checked="true"]').focus();
});
window.addEventListener("resize", () => {
  if (ratioMenu.matches(":popover-open")) positionRatioMenu();
});
ratioTrigger.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  if (!ratioMenu.matches(":popover-open")) ratioMenu.showPopover({ source: ratioTrigger });
});
ratioMenu.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    ratioMenu.hidePopover();
    ratioTrigger.focus();
    return;
  }
  const index = ratioOptions.indexOf(document.activeElement);
  const verticalKey = { ArrowDown: "ArrowRight", ArrowUp: "ArrowLeft" };
  const next = nextTabIndex(verticalKey[event.key] || event.key, index, ratioOptions.length);
  if (next < 0) return;
  event.preventDefault();
  ratioOptions[next].focus();
});
ratioMenu.addEventListener("click", (event) => {
  const option = event.target.closest("[data-ratio]");
  if (!option) return;
  const changed = form.elements.ratio.value !== option.dataset.ratio;
  setRatio(option.dataset.ratio);
  if (changed) form.elements.ratio.dispatchEvent(new Event("change", { bubbles: true }));
  ratioMenu.hidePopover();
  ratioTrigger.focus();
});

/** Duration readout and the slider's filled track (main site: white fill up to the thumb). */
function syncDuration() {
  const input = form.elements.duration;
  const value = Number(input.value);
  durationLabel.textContent = formatDuration(value);
  input.style.setProperty("--fill", `${((value - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`);
  input.setAttribute("aria-valuetext", formatDuration(value, true));
}

function service() {
  const connected = window.topviewHomeServices;
  if (!connected?.listMotionTemplates) throw homeError("motion.openFromSidebar");
  return connected;
}

function selectTab(id, focus = false) {
  if (id === category && tabs.childElementCount) {
    if (focus) tabs.querySelector('[aria-selected="true"]')?.focus();
    return;
  }
  category = id;
  gallery.scrollTop = 0;
  renderGallery();
  if (focus) tabs.querySelector('[aria-selected="true"]')?.focus();
}

/** Fade the tab row's physical edges that hide more tabs (RTL scrollLeft runs 0 → negative). */
function syncTabFade() {
  const max = tabs.scrollWidth - tabs.clientWidth;
  const position = Math.abs(tabs.scrollLeft);
  const rtl = getComputedStyle(tabs).direction === "rtl";
  const start = max > 1 && position > 1;
  const end = max > 1 && position < max - 1;
  tabs.dataset.fadeLeft = String(rtl ? end : start);
  tabs.dataset.fadeRight = String(rtl ? start : end);
}
tabs.addEventListener("scroll", syncTabFade, { passive: true });
new ResizeObserver(syncTabFade).observe(tabs);

tabs.addEventListener("keydown", (event) => {
  const list = [...tabs.children];
  const index = list.indexOf(document.activeElement);
  const next = nextTabIndex(event.key, index, list.length, document.documentElement.dir === "rtl");
  if (index < 0 || next < 0) return;
  event.preventDefault();
  selectTab(catalog.tabs[next].id, true);
});

let tabsCatalog;
/** Build the tab buttons once per catalog; later selections only flip attributes, so nothing flashes. */
function renderTabs() {
  if (tabsCatalog !== catalog) {
    tabsCatalog = catalog;
    tabs.replaceChildren(...catalog.tabs.map(({ id, name }) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.dataset.tabId = id;
      tab.setAttribute("role", "tab");
      tab.textContent = categoryLabels.get(id) || name;
      tab.setAttribute("aria-controls", "motion-gallery");
      tab.onclick = () => selectTab(id);
      return tab;
    }));
  }
  for (const tab of tabs.children) {
    const active = tab.dataset.tabId === category;
    if (tab.getAttribute("aria-selected") !== String(active)) tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
}

const hoverPreviewEnabled = window.matchMedia("(any-hover: hover) and (prefers-reduced-motion: no-preference)");
const previewVideos = new Map();
const previewCache = createMotionPreviewCache(warmLargeVideo);
const pageLoaded = new Promise(resolve => {
  if (document.readyState === "complete") resolve();
  else window.addEventListener("load", resolve, { once: true });
});
const FIRST_ROWS = 2;
const EXTRA_ROWS = 3;
let hoveredPreview;
let startupPreviews = [];
let homeCoversReady = false;
let previewSources = [];
let stagedRows = EXTRA_ROWS;

function templatesFor(id) {
  return catalog.templates.filter(item => id === "All" || item.category === id);
}

function releasePreview(video) {
  const url = video.getAttribute("src");
  video.removeAttribute("src");
  video.load();
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

function getPreviewVideo(source, blob) {
  let video = previewVideos.get(source.key);
  if (video && !video.error && (!blob || video.src.startsWith("blob:"))) {
    previewVideos.delete(source.key);
    previewVideos.set(source.key, video);
    return video;
  }
  if (video) releasePreview(video);
  video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("aria-hidden", "true");
  video.src = blob ? URL.createObjectURL(blob) : source.key;
  previewVideos.set(source.key, video);
  if (previewVideos.size > 12) {
    const [oldKey, oldVideo] = [...previewVideos].find(([, entry]) => entry !== hoveredPreview?.video);
    previewVideos.delete(oldKey);
    releasePreview(oldVideo);
  }
  return video;
}

function warmLargeVideo(source, signal) {
  const video = getPreviewVideo(source);
  if (video.readyState >= 2) return Promise.resolve();
  video.preload = "auto";
  return new Promise(resolve => {
    const listeners = new AbortController();
    const finish = () => {
      listeners.abort();
      clearTimeout(timeout);
      video.preload = "metadata";
      resolve();
    };
    const timeout = setTimeout(finish, 2500);
    video.addEventListener("loadeddata", finish, { signal: listeners.signal });
    video.addEventListener("error", finish, { signal: listeners.signal });
    signal.addEventListener("abort", () => {
      if (video !== hoveredPreview?.video && previewVideos.get(source.key) === video) {
        previewVideos.delete(source.key);
        releasePreview(video);
      }
      finish();
    }, { signal: listeners.signal });
  });
}

function stopHoverPreview() {
  if (!hoveredPreview) return;
  const { timer, video, frame } = hoveredPreview;
  hoveredPreview = undefined;
  clearTimeout(timer);
  if (!video) return;
  if (frame !== undefined) video.cancelVideoFrameCallback(frame);
  video.pause();
  video.classList.remove("motion-preview-playing");
  video.remove();
}

function startHoverPreview(card, source, event) {
  if (event.pointerType === "touch" || !hoverPreviewEnabled.matches) return;
  stopHoverPreview();
  const hover = { card };
  hoveredPreview = hover;
  hover.timer = setTimeout(async () => {
    if (!dialog.open || document.hidden || hoveredPreview !== hover) return;
    const existing = previewVideos.get(source.key);
    const blob = existing?.src.startsWith("blob:") ? undefined : await previewCache.getBlob(source);
    if (hoveredPreview !== hover || !dialog.open || document.hidden) return;
    const video = getPreviewVideo(source, blob);
    hover.video = video;
    card.append(video);
    try {
      await video.play();
      if (hoveredPreview !== hover) return;
      const reveal = () => {
        if (hoveredPreview === hover) video.classList.add("motion-preview-playing");
      };
      if (video.requestVideoFrameCallback) hover.frame = video.requestVideoFrameCallback(reveal);
      else reveal();
    } catch {
      if (hoveredPreview === hover) stopHoverPreview();
    }
  }, (previewVideos.get(source.key)?.readyState ?? 0) >= 2 ? 0 : 100);
}

function updatePreviewQueues() {
  const enabled = homeCoversReady && !document.hidden && hoverPreviewEnabled.matches && !navigator.connection?.saveData;
  const columns = Number(getComputedStyle(cards).getPropertyValue("--motion-columns")) || 3;
  const selected = dialog.open ? previewSources.slice(0, (FIRST_ROWS + stagedRows) * columns).filter(Boolean) : [];
  previewCache.setQueues(startupPreviews, selected, enabled);
}

function preloadHomeTemplates() {
  const firstTemplates = catalog.tabs.flatMap(({ id }) =>
    templatesFor(id).slice(0, FIRST_ROWS * (id === "Shorts" ? 5 : 3))
  );
  const posters = new Set(firstTemplates.map(item => item.poster).filter(Boolean));
  const covers = [...posters].map(url => {
    const cover = new Image();
    cover.fetchPriority = "low";
    cover.src = url;
    return cover.decode();
  });
  void Promise.all([pageLoaded, Promise.allSettled(covers)]).then(() => {
    startupPreviews = firstTemplates.map(motionPreviewSource).filter(Boolean);
    homeCoversReady = true;
    updatePreviewQueues();
  });
}

gallery.addEventListener("scroll", () => {
  if (gallery.scrollTop <= 0) return;
  const columns = Number(getComputedStyle(cards).getPropertyValue("--motion-columns")) || 3;
  const nextRow = cards.children[(FIRST_ROWS + stagedRows - 1) * columns];
  if (!nextRow || nextRow.getBoundingClientRect().top > gallery.getBoundingClientRect().bottom) return;
  stagedRows += EXTRA_ROWS;
  updatePreviewQueues();
}, { passive: true });
new ResizeObserver(updatePreviewQueues).observe(gallery);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopHoverPreview();
  updatePreviewQueues();
});
hoverPreviewEnabled.addEventListener("change", () => {
  if (!hoverPreviewEnabled.matches) stopHoverPreview();
  updatePreviewQueues();
});

function renderGallery() {
  stopHoverPreview();
  cards.classList.toggle("motion-cards-portrait", category === "Shorts");
  renderTabs();

  syncTabFade();
  tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  const visible = templatesFor(category);
  stagedRows = EXTRA_ROWS;
  previewSources = visible.map(motionPreviewSource);
  cards.replaceChildren(...visible.map((item, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "motion-card";
    card.dataset.templateId = item.id;
    card.title = item.label;
    card.setAttribute("aria-pressed", String(item.id === template?.id));
    const cover = document.createElement("img");
    cover.alt = "";
    cover.loading = "lazy";
    cover.src = item.poster;
    const title = document.createElement("span");
    title.className = "motion-card-title";
    title.textContent = item.label;
    card.append(cover, title);
    const source = previewSources[index];
    if (source) {
      card.onpointerenter = (event) => startHoverPreview(card, source, event);
      card.onpointerleave = () => {
        if (hoveredPreview?.card === card) stopHoverPreview();
      };
    }
    // Keep focus on the card so browsing by keyboard or pointer is not interrupted.
    card.onclick = () => updateReference(item);
    return card;
  }));
  updatePreviewQueues();
}

/** Focus the selected card (or the first one) so the user can pick or change a style. */
function revealGallery() {
  if (template && !cards.querySelector(`[data-template-id="${CSS.escape(template.id)}"]`)) selectTab("All");
  const target = cards.querySelector('[aria-pressed="true"]') || cards.firstElementChild;
  if (!(target instanceof HTMLButtonElement)) return;
  target.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  target.focus({ preventScroll: true });
}



const CATALOG_SESSION_KEY = "topview:motion-catalog:v1";

async function loadSessionCatalog() {
  try {
    const cached = sessionStorage.getItem(CATALOG_SESSION_KEY);
    if (cached) {
      const result = JSON.parse(cached);
      if (Array.isArray(result.tabs) && result.templates?.length) return result;
    }
  } catch {
    // Storage is optional in the embedded browser.
  }
  const result = await service().listMotionTemplates();
  if (result.templates.length) {
    try {
      sessionStorage.setItem(CATALOG_SESSION_KEY, JSON.stringify(result));
    } catch {
      // The in-page promise still keeps the catalog for this page.
    }
  }
  return result;
}

let catalogRequest;
function load() {
  if (catalogRequest) return catalogRequest;
  retry.hidden = true;
  setNotice(t("motion.loading"), "info");
  cards.setAttribute("aria-busy", "true");
  cards.innerHTML = '<div class="motion-placeholder" aria-hidden="true"></div>'.repeat(6);
  catalogRequest = loadSessionCatalog().then((result) => {
    catalog = result;
    renderGallery();
    setNotice(catalog.templates.length ? "" : t("motion.noTemplates"), catalog.templates.length ? "" : "error");
    retry.hidden = catalog.templates.length > 0;
    if (!catalog.templates.length) catalogRequest = undefined;
    preloadHomeTemplates();
  }).catch((error) => {
    catalogRequest = undefined;
    cards.replaceChildren();
    setNotice(localizeHomeError(error, { fallback: "motion.loadFailed", scope: "motion-load" }), "error");
    retry.hidden = false;
  }).finally(() => {
    cards.removeAttribute("aria-busy");
    sync();
  });
  return catalogRequest;
}

function preview(file) {
  if (!previews.has(file)) previews.set(file, URL.createObjectURL(file));
  return previews.get(file);
}

function renderFiles() {
  for (const [file, url] of previews) {
    if (files.includes(file)) continue;
    URL.revokeObjectURL(url);
    previews.delete(file);
  }
  fileList.hidden = !files.length;
  let videos = 0;
  let images = 0;
  fileList.replaceChildren(...files.map((file, index) => {
    const item = document.createElement("li");
    item.className = "motion-file";
    item.title = file.name;
    const isVideo = file.type.startsWith("video/");
    const media = document.createElement(isVideo ? "video" : "img");
    // "#t=0.1" asks the browser for a real first frame instead of a black poster.
    media.src = isVideo ? `${preview(file)}#t=0.1` : preview(file);
    if (isVideo) {
      media.muted = true;
      media.playsInline = true;
      media.preload = "metadata";
      media.setAttribute("aria-hidden", "true");
      item.dataset.kind = "video";
    } else media.alt = "";
    // Main site caption: "Video 1" / "Image 1", counted per kind.
    const name = document.createElement("span");
    name.className = "motion-file-name";
    name.textContent = isVideo ? t("motion.videoItem", { index: ++videos }) : t("motion.imageItem", { index: ++images });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "motion-file-remove";
    remove.setAttribute("aria-label", t("motion.removeFile", { name: file.name }));
    remove.title = t("motion.removeFile", { name: file.name });
    remove.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    remove.onclick = () => {
      files = files.filter((entry) => entry !== file);
      renderFiles();
      resetFeedback();
      sync();
      const buttons = fileList.querySelectorAll(".motion-file-remove");
      (buttons[Math.min(index, buttons.length - 1)] || form.elements.files).focus();
    };
    item.append(media, name, remove);
    return item;
  }));
}

openButton.onclick = () => {
  dialog.showModal();
  updatePreviewQueues();
  // Start on the style picker instead of the close button.
  const start = cards.querySelector('[aria-pressed="true"]') || tabs.querySelector('[aria-selected="true"]');
  if (start) start.focus({ preventScroll: true });
  if (!catalog?.templates.length) void load();
  sync();
};
window.addEventListener("topview:services-ready", () => { void load(); });
retry.onclick = load;
if (window.topviewHomeServices?.listMotionTemplates) void load();
dialog.querySelector(".motion-close").onclick = () => dialog.close();
dialog.addEventListener("close", () => {
  if (ratioMenu.matches(":popover-open")) ratioMenu.hidePopover();
  stopHoverPreview();
  updatePreviewQueues();
  openButton.focus();
});
referenceTile.onclick = revealGallery;
clear.onclick = () => {
  updateReference(undefined);
  referenceTile.focus();
};
form.elements.duration.oninput = syncDuration;
form.elements.idea.addEventListener("input", () => {
  if (notice.dataset.tone === "success" || notice.dataset.tone === "error") resetFeedback();
  sync();
});
form.elements.idea.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || event.isComposing) return;
  event.preventDefault();
  if (!submit.disabled) form.requestSubmit(submit);
});
form.elements.files.onchange = () => {
  const merged = mergeMotionFiles(files, [...form.elements.files.files], MOTION_MAX_ASSETS);
  files = merged.files;
  form.elements.files.value = "";
  renderFiles();
  resetFeedback();
  if (merged.overflow) setNotice(t("workbench.maxFiles"), "error");
  sync();
};
form.addEventListener("change", (event) => {
  if (event.target.name === "ratio" || event.target.name === "duration") {
    if (filled) { resetFeedback(); setNotice(); sync(); }
    return;
  }
  if (event.target.name !== "agent") return;
  resetFeedback();
  setNotice();
  sync();
});

form.onsubmit = async (event) => {
  event.preventDefault();
  if (pending || !motionReadiness({ template, idea: form.elements.idea.value, assets: files.length }).ready) return;
  const input = {
    templateId: template.id,
    idea: form.elements.idea.value,
    ratio: form.elements.ratio.value,
    duration: Number(form.elements.duration.value),
    files: [...files],
  };
  pending = submit.disabled = true;
  submit.setAttribute("aria-busy", "true");
  resetFeedback();
  setNotice();
  try {
    if (copyMode()) {
      const prompt = service().buildMotionCopyBrief(input);
      try {
        await navigator.clipboard.writeText(prompt);
        setNotice(input.files.length ? t("motion.promptCopiedAttach") : t("motion.promptCopied"), "success");
        submit.dataset.copied = "true";
        submitLabel.textContent = t("motion.copied");
        copiedTimer = setTimeout(() => { delete submit.dataset.copied; sync(); }, 2000);
      } catch {
        fallback.value = prompt;
        fallback.hidden = false;
        fallback.focus();
        fallback.select();
        setNotice(t("motion.clipboardUnavailable"), "error");
      }
    } else {
      await service().composeMotionDraft(input);
      // Stay in Motion Studio with the selection and inputs kept, so the user can
      // review, tweak and fill again without starting over.
      filled = true;
      setNotice(t("composer.addedReview"), "success");
    }
  } catch (error) {
    setNotice(localizeHomeError(error, { scope: "motion-compose" }), "error");
  } finally {
    pending = false;
    submit.removeAttribute("aria-busy");
    sync();
  }
};
syncDuration();
sync();

/**
 * MOTION wordmark: put each keyframe diamond under its glyph's ink center. The span box is the
 * glyph advance; side bearings (T, I, N…) differ per font, so measure the real ink box with the
 * computed font and store the offset from the box center as --kx. Re-measured when fonts load or the
 * card resizes (the type size follows the card via container units).
 */
const motionWord = document.querySelector(".motion-type");
if (motionWord) {
  const context = document.createElement("canvas").getContext("2d");
  const measure = () => {
    for (const letter of motionWord.children) {
      const style = getComputedStyle(letter);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const ink = context.measureText(letter.textContent);
      const offset = (ink.actualBoundingBoxRight - ink.actualBoundingBoxLeft) / 2 - ink.width / 2;
      letter.style.setProperty("--kx", `${Number.isFinite(offset) ? offset.toFixed(2) : 0}px`);
    }
  };
  measure();
  document.fonts?.ready.then(measure).catch(() => {});
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(motionWord);
}

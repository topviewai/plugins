import { languageOptions } from "./language-options.mjs";

/**
 * UI copy lives in the main site's TransModule.PluginHome locale files (semantic keys,
 * `{{slot}}` placeholders). The host hands the selected language and its English fallback
 * to this runtime through `getMessages(language)`; the runtime bundles no dictionaries.
 */
const preferenceKey = "topview.plugin-home.locale";
const supported = new Map(languageOptions.map(({ value }) => [value.toLowerCase(), value]));
const browser = typeof document !== "undefined";
const MESSAGES_TIMEOUT_MS = 8000;
let messages = {};
let fallback = {};
export let language = "en";

export function normalizeLanguage(value) {
  if (typeof value !== "string") return null;
  const tag = value.trim().replaceAll("_", "-").toLowerCase();
  if (supported.has(tag)) return supported.get(tag);
  const base = tag.split("-")[0];
  if (tag === "tw" || /^zh-(?:hant|hk|mo|tw)(?:-|$)/.test(tag)) return "zh-TW";
  if (base === "zh") return "zh-CN";
  if (base === "no" || base === "nn") return "nb";
  return supported.get(base) || null;
}

function preference() {
  try { return normalizeLanguage(localStorage.getItem(preferenceKey)); }
  catch { return null; }
}

function lookup(dictionary, key) {
  const value = key.split(".").reduce(
    (node, part) => (node && typeof node === "object" ? node[part] : undefined), dictionary);
  return typeof value === "string" ? value : undefined;
}

export function t(key, values = {}) {
  if (typeof key !== "string") return key;
  const text = lookup(messages, key) ?? lookup(fallback, key) ?? key;
  return text.replace(/\{\{(\w+)\}\}/g, (match, slot) => (values[slot] === undefined ? match : String(values[slot])));
}

/** True when the key resolves to copy (in the selected language or the English fallback). */
export function hasMessage(key) {
  return typeof key === "string" && (lookup(messages, key) ?? lookup(fallback, key)) !== undefined;
}

export function translateScene(scene) {
  const copy = { ...scene };
  for (const key of ["name", "desc", "prompt", "reply", "hint"]) {
    if (typeof copy[key] === "string") copy[key] = t(copy[key]);
  }
  return copy;
}

const isDictionary = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Install host-provided copy; non-dictionary input clears it. */
export function applyMessages(next) {
  messages = isDictionary(next?.messages) ? next.messages : {};
  fallback = isDictionary(next?.fallback) ? next.fallback : {};
}

// The Browser host installs services on iframe load, which can follow module evaluation.
function installedServices(target) {
  if (typeof target.topviewHomeServices?.getMessages === "function") return Promise.resolve(target.topviewHomeServices);
  return new Promise((resolve) => {
    target.addEventListener("topview:services-installed", () => resolve(target.topviewHomeServices), { once: true });
  });
}

export async function loadMessages(code, { target = globalThis, timeoutMs = MESSAGES_TIMEOUT_MS } = {}) {
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Plugin messages timed out")), timeoutMs);
    });
    const services = await Promise.race([installedServices(target), timeout]);
    const result = await Promise.race([services.getMessages(code), timeout]);
    return {
      messages: isDictionary(result?.messages) ? result.messages : {},
      fallback: isDictionary(result?.fallback) ? result.fallback : {},
    };
  } catch {
    return { messages: {}, fallback: {} };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Markup carries English defaults: `data-i18n` replaces the element's own text, and
 * `data-i18n-attrs="aria-label:key;placeholder:key"` replaces attributes.
 */
function localizeMarkup() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  for (const element of document.querySelectorAll("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (!hasMessage(key)) continue;
    const text = [...element.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE && node.data.trim());
    if (text) text.data = text.data.replace(text.data.trim(), () => t(key));
    else if (!element.children.length) element.textContent = t(key);
  }
  for (const element of document.querySelectorAll("[data-i18n-attrs]")) {
    for (const pair of element.dataset.i18nAttrs.split(";")) {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (attr && key && hasMessage(key)) element.setAttribute(attr, t(key));
    }
  }
}

function bindLanguageMenu() {
  const trigger = document.querySelector("#language-button");
  const list = document.querySelector("#language-options");
  if (!trigger || !list) return;
  const url = new URL(location.href);
  const manual = preference() || normalizeLanguage(url.searchParams.get("choice"));
  const options = [{ value: "", label: t("header.followCodex") }, ...languageOptions];
  for (const { value, label } of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.lang = value || language;
    button.dir = "auto";
    const selected = manual === value || (!manual && !value);
    button.setAttribute("aria-pressed", String(selected));
    if (selected) {
      const check = document.createElement("span");
      check.textContent = "✓";
      check.setAttribute("aria-hidden", "true");
      button.append(check);
    }
    button.addEventListener("click", () => {
      try {
        if (value) localStorage.setItem(preferenceKey, value);
        else localStorage.removeItem(preferenceKey);
      } catch {
        if (value) url.searchParams.set("choice", value);
        else url.searchParams.delete("choice");
        location.replace(url.href);
        return;
      }
      url.searchParams.delete("choice");
      location.replace(url.href);
    });
    list.append(button);
  }
  function setOpen(open) {
    list.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  }
  trigger.addEventListener("click", () => {
    setOpen(list.hidden);
    if (!list.hidden) list.querySelector("[aria-pressed=true]")?.focus();
  });
  const popover = document.querySelector("#credits-card");
  new MutationObserver(() => { if (popover.hidden) setOpen(false); })
    .observe(popover, { attributes: true, attributeFilter: ["hidden"] });
}

if (browser) {
  // The same-origin main-site wrapper forwards the locale from MCP host context.
  window.addEventListener("topview:host-locale", ({ detail }) => {
    const host = normalizeLanguage(detail) || "en";
    const url = new URL(location.href);
    if (normalizeLanguage(url.searchParams.get("hostLocale")) === host) return;
    url.searchParams.set("hostLocale", host);
    if (preference() || url.searchParams.has("choice") || host === language) {
      history.replaceState(null, "", url.href);
    } else {
      location.replace(url.href);
    }
  });
}
async function initializeLocale() {
  if (!browser) return;
  const params = new URLSearchParams(location.search);
  language = preference() || normalizeLanguage(params.get("choice"))
    || normalizeLanguage(params.get("hostLocale")) || "en";
  applyMessages(await loadMessages(language));
  // Without host copy the English markup defaults stay, so the declared language follows them.
  if (!Object.keys(messages).length && !Object.keys(fallback).length) language = "en";
  localizeMarkup();
  bindLanguageMenu();
}
export const localeReady = initializeLocale();
if (browser) window.TopviewHomeLocale = { t, ready: localeReady, get language() { return language; } };

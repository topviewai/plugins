import { hasMessage, language, t } from "./locale.mjs";

const fixedErrors = new Map([
  ["Invalid upload response", "errors.uploadFailed"],
  ["Invalid navigation", "projectOpen.pageFailed"],
  ["Invalid skill library response", "workbench.scenesFailed"],
  ["Skill library pagination limit exceeded", "workbench.scenesFailed"],
  ["Invalid project response", "projects.loadFailed"],
  ["Homepage closed", "errors.reconnectPlugin"],
]);
const codedErrors = new Map([
  ["INVALID_BALANCE", "errors.balanceUnavailable"],
  ["SCENE_REQUIRED", "errors.sceneRequired"],
  ["INPUT_REQUIRED", "errors.inputRequired"],
  ["SERVICE_UNAVAILABLE", "errors.serviceUnavailable"],
  ["CREATION_PENDING", "errors.creationPending"],
  ["INVALID_PROJECT", "errors.invalidProject"],
  ["AUTHORIZATION_REQUIRED", "errors.authorizationRequired"],
  ["ACCOUNT_MISMATCH", "errors.accountMismatch"],
  ["PLUGIN_CONNECTION_REQUIRED", "errors.reconnectPlugin"],
  ["CREATION_PENDING_CHECK_PROJECTS", "errors.creationPendingCheckProjects"],
]);
const count = value => (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)))
  && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 10000
  ? new Intl.NumberFormat(language).format(Number(value)) : null;
/** An error the home UI localizes by key; the message stays the key, never rendered copy. */
export function homeError(messageKey, values) {
  return Object.assign(new Error(messageKey), { messageKey, ...(values ? { values } : {}) });
}
let sequence = 0;
/** Localize known failures; never render/log arbitrary backend payloads or credentials. */
export function localizeHomeError(error, { fallback = "errors.generic", scope = "home" } = {}) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (codedErrors.has(code)) return t(codedErrors.get(code));
  // Host services attach a locale key and numeric slots; arbitrary messages are never shown.
  const key = typeof error?.messageKey === "string" ? error.messageKey : "";
  if (/^(errors|motion|projects|projectOpen|composer|host|catalog|workbench)\.[A-Za-z0-9.]+$/.test(key) && hasMessage(key)) {
    const values = {};
    for (const [slot, value] of Object.entries(error.values || {})) {
      if (/^\w{1,20}$/.test(slot) && count(value) !== null) values[slot] = count(value);
    }
    return t(key, values);
  }
  const message = typeof error?.message === "string" ? error.message : "";
  if (fixedErrors.has(message)) return t(fixedErrors.get(message));
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || (++sequence).toString(36);
  const id = `HOME-${suffix}`;
  const safeScope = /^[a-z-]{1,40}$/.test(scope) ? scope : "home";
  const safeName = ["Error", "TypeError", "RangeError", "AbortError"].includes(error?.name) ? error.name : "Error";
  const status = Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : undefined;
  // Correlation and safe metadata survive, but tokens, raw responses and arbitrary messages do not.
  console.warn("[Topview home diagnostic]", { id, scope: safeScope, name: safeName, ...(status ? { status } : {}) });
  return `${t(fallback)} ${t("errors.diagnosticId", { id })}`;
}

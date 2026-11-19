import { t } from "./locale.mjs";
/** Account-bound operations supplied by the Browser service, never browser cookies/tokens. */
export class HomeServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export function normalizeBalance(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HomeServiceError("INVALID_BALANCE", t("errors.balanceUnavailable"));
  }
  return value;
}

export function buildCreationRequest(scene, text, files = []) {
  if (!scene) throw new HomeServiceError("SCENE_REQUIRED", t("errors.sceneRequired"));
  if (!text.trim() && !files.length)
    throw new HomeServiceError("INPUT_REQUIRED", t("errors.inputRequired"));
  const skill = scene.sourceSkillId
    ? { id: scene.sourceSkillId, name: scene.sourceSkillName }
    : null;
  return {
    scenarioId: scene.id,
    ...(scene.presetId ? { presetId: scene.presetId } : {}),
    workflow: scene.route,
    prompt: [skill ? `Use skill: ${skill.name}` : "", text.trim()]
      .filter(Boolean)
      .join("\n\n"),
    files: [...files],
    skill,
    ...(scene.desc && skill
      ? { skillContext: { description: scene.desc } }
      : {}),
    autoSubmit: false,
  };
}

export function createHomeClient(resolveService) {
  const invoke = async (name, ...args) => {
    const service = resolveService();
    if (typeof service?.[name] !== "function") {
      throw new HomeServiceError(
        "SERVICE_UNAVAILABLE",
        t("errors.serviceUnavailable"),
      );
    }
    return service[name](...args);
  };
  let creating = false;
  return {
    async getCredits() {
      return normalizeBalance(await invoke("getCredits"));
    },
    openPricing: () => invoke("openPricingModal"),
    listProjects: (options) => invoke("listProjects", options),
    openProject: (canvasId) => invoke("openProject", canvasId),
    async createTask(scene, text, files) {
      if (creating)
        throw new HomeServiceError("CREATION_PENDING", t("errors.creationPending"));
      const input = buildCreationRequest(scene, text, files);
      creating = true;
      try {
        const result = await invoke("createCanvasTask", input);
        if (typeof result?.canvasId !== "string" || !result.canvasId.trim()) {
          throw new HomeServiceError(
            "INVALID_PROJECT",
            t("errors.invalidProject"),
          );
        }
        return { canvasId: result.canvasId };
      } finally {
        creating = false;
      }
    },
  };
}

import { STORAGE_KEY } from "./core/defaults";
import { getAppliedDelay } from "./core/matcher";
import {
  addRule,
  countActiveRules,
  createInitialSettings,
  deleteRule,
  sanitizeSettings,
  setRuleEnabled,
  updateGlobalDelay,
  updateGlobalEnabled,
  updateRuleDelay
} from "./core/state";
import { loadSettings, saveSettings } from "./core/storage";
import type { ExtensionSettings } from "./core/types";

const webext = (
  (globalThis as unknown as { browser?: typeof browser; chrome?: typeof browser }).browser ??
  (globalThis as unknown as { browser?: typeof browser; chrome?: typeof browser }).chrome
) as typeof browser;

if (!webext) {
  throw new Error("Firefox WebExtension API indisponível.");
}

let settings: ExtensionSettings = createInitialSettings();
let affectedRequests = 0;

async function refreshSettingsFromStorage(): Promise<void> {
  settings = await loadSettings(webext.storage.local);
}

async function persistSettings(): Promise<void> {
  await saveSettings(webext.storage.local, settings);
}

function runtimeSnapshot() {
  return {
    settings,
    affectedRequests,
    activeRules: countActiveRules(settings)
  };
}

function okResponse() {
  return {
    ok: true,
    ...runtimeSnapshot()
  };
}

function errorResponse(error: string) {
  return {
    ok: false,
    error,
    ...runtimeSnapshot()
  };
}

async function mutateAndPersist(
  mutate: () => { ok: boolean; settings?: ExtensionSettings; error?: string }
): Promise<Record<string, unknown>> {
  const result = mutate();
  if (!result.ok || !result.settings) {
    return errorResponse(result.error ?? "Falha ao atualizar.");
  }

  settings = result.settings;
  await persistSettings();
  return okResponse();
}

async function init(): Promise<void> {
  await refreshSettingsFromStorage();
}

webext.runtime.onInstalled.addListener(async () => {
  await refreshSettingsFromStorage();
  await persistSettings();
});

webext.runtime.onStartup.addListener(async () => {
  await refreshSettingsFromStorage();
});

webext.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  const changed = changes[STORAGE_KEY];
  if (changed?.newValue) {
    settings = sanitizeSettings(changed.newValue);
  }
});

webext.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { url } = details;

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return {};
    }

    const applied = getAppliedDelay(url, settings);
    if (!applied) {
      return {};
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        affectedRequests += 1;
        resolve({});
      }, applied.delayMs);
    });
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

webext.runtime.onMessage.addListener(async (message: Record<string, unknown>) => {
  const type = String(message.type ?? "");

  switch (type) {
    case "GET_STATE":
      return okResponse();
    case "ADD_RULE":
      return mutateAndPersist(() =>
        addRule(settings, {
          type: message.ruleType === "regex" ? "regex" : "exact",
          value: String(message.value ?? ""),
          delayInput: typeof message.delayInput === "string" || typeof message.delayInput === "number"
            ? message.delayInput
            : undefined
        })
      );
    case "DELETE_RULE":
      return mutateAndPersist(() => deleteRule(settings, String(message.id ?? "")));
    case "SET_RULE_ENABLED":
      return mutateAndPersist(() =>
        setRuleEnabled(settings, String(message.id ?? ""), Boolean(message.enabled))
      );
    case "UPDATE_RULE_DELAY":
      return mutateAndPersist(() =>
        updateRuleDelay(settings, String(message.id ?? ""), String(message.delayInput ?? ""))
      );
    case "SET_GLOBAL_ENABLED":
      return mutateAndPersist(() => updateGlobalEnabled(settings, Boolean(message.enabled)));
    case "SET_GLOBAL_DELAY":
      return mutateAndPersist(() => updateGlobalDelay(settings, String(message.delayInput ?? "")));
    case "RESET_SESSION_COUNTER":
      affectedRequests = 0;
      return okResponse();
    default:
      return errorResponse("Ação desconhecida.");
  }
});

void init();

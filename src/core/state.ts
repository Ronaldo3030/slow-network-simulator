import { DEFAULT_SETTINGS, MIN_DELAY_MS } from "./defaults";
import type { DelayRule, ExtensionSettings, RuleType } from "./types";
import { isRuleValid } from "./matcher";
import { validateDelay, validateNewRule } from "./validation";

export interface ActionResult {
  ok: boolean;
  settings?: ExtensionSettings;
  error?: string;
}

export function createInitialSettings(): ExtensionSettings {
  return {
    globalEnabled: DEFAULT_SETTINGS.globalEnabled,
    globalDelayMs: DEFAULT_SETTINGS.globalDelayMs,
    rules: []
  };
}

function makeRuleId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return `rule_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
}

function sanitizeRule(candidate: Partial<DelayRule>, index: number): DelayRule {
  const type: RuleType = candidate.type === "regex" ? "regex" : "exact";
  const value = typeof candidate.value === "string" ? candidate.value : "";
  const parsedDelay = Number.parseInt(String(candidate.delayMs ?? DEFAULT_SETTINGS.globalDelayMs), 10);
  const safeDelay = Number.isFinite(parsedDelay) && parsedDelay >= MIN_DELAY_MS
    ? parsedDelay
    : DEFAULT_SETTINGS.globalDelayMs;

  return {
    id: typeof candidate.id === "string" && candidate.id.trim() ? candidate.id : `restored_${index}`,
    type,
    value,
    delayMs: safeDelay,
    enabled: candidate.enabled !== false,
    createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now() + index
  };
}

export function sanitizeSettings(candidate: unknown): ExtensionSettings {
  if (!candidate || typeof candidate !== "object") {
    return createInitialSettings();
  }

  const raw = candidate as Partial<ExtensionSettings>;
  const globalDelayParsed = Number.parseInt(String(raw.globalDelayMs ?? DEFAULT_SETTINGS.globalDelayMs), 10);
  const globalDelayMs = Number.isFinite(globalDelayParsed) && globalDelayParsed >= MIN_DELAY_MS
    ? globalDelayParsed
    : DEFAULT_SETTINGS.globalDelayMs;

  return {
    globalEnabled: raw.globalEnabled !== false,
    globalDelayMs,
    rules: Array.isArray(raw.rules) ? raw.rules.map((rule, index) => sanitizeRule(rule, index)) : []
  };
}

export function addRule(
  settings: ExtensionSettings,
  input: { type: RuleType; value: string; delayInput?: string | number }
): ActionResult {
  const validation = validateNewRule({
    type: input.type,
    value: input.value,
    delayInput: input.delayInput,
    globalDelayMs: settings.globalDelayMs
  });

  if (!validation.ok || validation.delayMs === undefined || !validation.normalizedValue) {
    return { ok: false, error: validation.error ?? "Regra inválida." };
  }

  const newRule: DelayRule = {
    id: makeRuleId(),
    type: input.type,
    value: validation.normalizedValue,
    delayMs: validation.delayMs,
    enabled: true,
    createdAt: Date.now()
  };

  return {
    ok: true,
    settings: {
      ...settings,
      rules: [...settings.rules, newRule]
    }
  };
}

export function deleteRule(settings: ExtensionSettings, id: string): ActionResult {
  return {
    ok: true,
    settings: {
      ...settings,
      rules: settings.rules.filter((rule) => rule.id !== id)
    }
  };
}

export function setRuleEnabled(settings: ExtensionSettings, id: string, enabled: boolean): ActionResult {
  return {
    ok: true,
    settings: {
      ...settings,
      rules: settings.rules.map((rule) => (rule.id === id ? { ...rule, enabled } : rule))
    }
  };
}

export function updateRuleDelay(settings: ExtensionSettings, id: string, delayInput: string | number): ActionResult {
  const parsed = typeof delayInput === "number" ? delayInput : Number.parseInt(delayInput, 10);
  const delayError = validateDelay(parsed);

  if (delayError) {
    return { ok: false, error: delayError };
  }

  return {
    ok: true,
    settings: {
      ...settings,
      rules: settings.rules.map((rule) => (rule.id === id ? { ...rule, delayMs: parsed } : rule))
    }
  };
}

export function updateGlobalEnabled(settings: ExtensionSettings, enabled: boolean): ActionResult {
  return {
    ok: true,
    settings: {
      ...settings,
      globalEnabled: enabled
    }
  };
}

export function updateGlobalDelay(settings: ExtensionSettings, delayInput: string | number): ActionResult {
  const parsed = typeof delayInput === "number" ? delayInput : Number.parseInt(delayInput, 10);
  const delayError = validateDelay(parsed);

  if (delayError) {
    return { ok: false, error: delayError };
  }

  return {
    ok: true,
    settings: {
      ...settings,
      globalDelayMs: parsed
    }
  };
}

export function countActiveRules(settings: ExtensionSettings): number {
  return settings.rules.filter((rule) => rule.enabled && isRuleValid(rule)).length;
}

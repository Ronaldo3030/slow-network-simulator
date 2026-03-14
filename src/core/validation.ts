import { MIN_DELAY_MS } from "./defaults";
import type { RuleType } from "./types";

export interface RuleValidationInput {
  type: RuleType;
  value: string;
  delayInput?: string | number;
  globalDelayMs: number;
}

export interface RuleValidationResult {
  ok: boolean;
  error?: string;
  delayMs?: number;
  normalizedValue?: string;
}

export function validateRegex(pattern: string): string | null {
  try {
    // eslint-disable-next-line no-new
    new RegExp(pattern);
    return null;
  } catch {
    return "Regex inválida.";
  }
}

export function validateDelay(delayMs: number): string | null {
  if (!Number.isFinite(delayMs) || Number.isNaN(delayMs)) {
    return "Delay deve ser um número válido.";
  }

  if (delayMs < 0) {
    return "Delay não pode ser negativo.";
  }

  if (delayMs === 0) {
    return "Delay deve ser maior que zero.";
  }

  if (delayMs < MIN_DELAY_MS) {
    return `Delay mínimo: ${MIN_DELAY_MS} ms.`;
  }

  return null;
}

export function parseDelay(delayInput: string | number | undefined, fallbackMs: number): { delayMs?: number; error?: string } {
  if (delayInput === undefined || delayInput === "") {
    const fallbackError = validateDelay(fallbackMs);
    return fallbackError ? { error: fallbackError } : { delayMs: fallbackMs };
  }

  const parsed = typeof delayInput === "number" ? delayInput : Number.parseInt(delayInput, 10);
  const delayError = validateDelay(parsed);

  if (delayError) {
    return { error: delayError };
  }

  return { delayMs: parsed };
}

export function validateNewRule(input: RuleValidationInput): RuleValidationResult {
  const normalizedValue = input.value.trim();

  if (!normalizedValue) {
    return { ok: false, error: "Informe uma URL ou regex." };
  }

  if (input.type === "regex") {
    const regexError = validateRegex(normalizedValue);
    if (regexError) {
      return { ok: false, error: regexError };
    }
  }

  const delayParse = parseDelay(input.delayInput, input.globalDelayMs);
  if (delayParse.error || delayParse.delayMs === undefined) {
    return { ok: false, error: delayParse.error ?? "Delay inválido." };
  }

  return {
    ok: true,
    delayMs: delayParse.delayMs,
    normalizedValue
  };
}

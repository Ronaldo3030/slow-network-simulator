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

const MAX_REGEX_LENGTH = 500;

function detectNestedQuantifiers(pattern: string): boolean {
  const clean = pattern.replace(/\\./g, "");
  const noClasses = clean.replace(/\[[^\]]*\]/g, "");

  const hasQuantifier: boolean[] = [];
  let depth = 0;

  for (let i = 0; i < noClasses.length; i++) {
    const ch = noClasses[i];

    if (ch === "(") {
      depth++;
      hasQuantifier[depth] = false;
    } else if (ch === ")") {
      if (depth <= 0) continue;
      const inner = hasQuantifier[depth];
      depth--;
      const next = noClasses[i + 1];
      if (inner && (next === "+" || next === "*" || next === "{")) {
        return true;
      }
      if (inner && depth > 0) {
        hasQuantifier[depth] = true;
      }
    } else if ((ch === "+" || ch === "*") && depth > 0) {
      hasQuantifier[depth] = true;
    }
  }

  return false;
}

export function validateRegex(pattern: string): string | null {
  if (pattern.length > MAX_REGEX_LENGTH) {
    return `Regex muito longa (máximo: ${MAX_REGEX_LENGTH} caracteres).`;
  }

  try {
    // eslint-disable-next-line no-new
    new RegExp(pattern);
  } catch {
    return "Regex inválida.";
  }

  if (detectNestedQuantifiers(pattern)) {
    return "Regex com quantificadores aninhados pode travar o navegador.";
  }

  return null;
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

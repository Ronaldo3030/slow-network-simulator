import type { DelayRule, ExtensionSettings } from "./types";
import { validateRegex } from "./validation";

const regexCache = new Map<string, RegExp | null>();
const MAX_CACHE_SIZE = 100;

function getCompiledRegex(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) {
    return regexCache.get(pattern) ?? null;
  }

  if (validateRegex(pattern) !== null) {
    regexCache.set(pattern, null);
    return null;
  }

  const re = new RegExp(pattern);
  if (regexCache.size >= MAX_CACHE_SIZE) {
    const firstKey = regexCache.keys().next().value;
    if (firstKey !== undefined) regexCache.delete(firstKey);
  }
  regexCache.set(pattern, re);
  return re;
}

export function isRuleValid(rule: DelayRule): boolean {
  if (!rule.value.trim() || rule.delayMs <= 0) {
    return false;
  }

  if (rule.type === "regex") {
    return getCompiledRegex(rule.value) !== null;
  }

  return true;
}

export function ruleMatchesUrl(rule: DelayRule, url: string): boolean {
  if (!rule.enabled || !isRuleValid(rule)) {
    return false;
  }

  if (rule.type === "exact") {
    return rule.value === url;
  }

  const re = getCompiledRegex(rule.value);
  return re !== null && re.test(url);
}

export function findMatchingRule(url: string, rules: DelayRule[]): DelayRule | null {
  let bestRule: DelayRule | null = null;

  for (const rule of rules) {
    if (!ruleMatchesUrl(rule, url)) {
      continue;
    }

    if (!bestRule || rule.delayMs > bestRule.delayMs) {
      bestRule = rule;
    }
  }

  return bestRule;
}

export function getAppliedDelay(url: string, settings: ExtensionSettings): { delayMs: number; rule: DelayRule } | null {
  if (!settings.globalEnabled) {
    return null;
  }

  const rule = findMatchingRule(url, settings.rules);
  if (!rule) {
    return null;
  }

  return {
    delayMs: rule.delayMs,
    rule
  };
}

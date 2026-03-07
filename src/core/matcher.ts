import type { DelayRule, ExtensionSettings } from "./types";
import { validateRegex } from "./validation";

export function isRuleValid(rule: DelayRule): boolean {
  if (!rule.value.trim() || rule.delayMs <= 0) {
    return false;
  }

  if (rule.type === "regex") {
    return validateRegex(rule.value) === null;
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

  return new RegExp(rule.value).test(url);
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

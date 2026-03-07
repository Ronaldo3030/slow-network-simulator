import { describe, expect, it } from "vitest";
import { getAppliedDelay } from "../src/core/matcher";
import { addRule, createInitialSettings, setRuleEnabled, updateGlobalEnabled } from "../src/core/state";

describe("matcher", () => {
  it("faz correspondência por URL exata", () => {
    const added = addRule(createInitialSettings(), {
      type: "exact",
      value: "https://site.com/a",
      delayInput: "200"
    });

    const result = getAppliedDelay("https://site.com/a", added.settings!);
    expect(result?.delayMs).toBe(200);
  });

  it("faz correspondência por regex", () => {
    const added = addRule(createInitialSettings(), {
      type: "regex",
      value: "^https://site\\.com/api/.*$",
      delayInput: "450"
    });

    const result = getAppliedDelay("https://site.com/api/users", added.settings!);
    expect(result?.delayMs).toBe(450);
  });

  it("não aplica delay quando regra está pausada", () => {
    const added = addRule(createInitialSettings(), {
      type: "exact",
      value: "https://site.com/a",
      delayInput: "200"
    });

    const id = added.settings!.rules[0].id;
    const paused = setRuleEnabled(added.settings!, id, false);

    const result = getAppliedDelay("https://site.com/a", paused.settings!);
    expect(result).toBeNull();
  });

  it("não aplica delay quando toggle global está desligado", () => {
    const added = addRule(createInitialSettings(), {
      type: "exact",
      value: "https://site.com/a",
      delayInput: "200"
    });

    const globalOff = updateGlobalEnabled(added.settings!, false);
    const result = getAppliedDelay("https://site.com/a", globalOff.settings!);
    expect(result).toBeNull();
  });

  it("usa regra com maior delay quando múltiplas regras casam", () => {
    const first = addRule(createInitialSettings(), {
      type: "regex",
      value: "^https://site\\.com/.*$",
      delayInput: "300"
    });

    const second = addRule(first.settings!, {
      type: "exact",
      value: "https://site.com/painel",
      delayInput: "1100"
    });

    const result = getAppliedDelay("https://site.com/painel", second.settings!);
    expect(result?.delayMs).toBe(1100);
    expect(result?.rule.type).toBe("exact");
  });

  it("prioriza delay da regra sobre delay global", () => {
    const initial = createInitialSettings();
    initial.globalDelayMs = 1500;

    const added = addRule(initial, {
      type: "exact",
      value: "https://site.com/a",
      delayInput: "280"
    });

    const result = getAppliedDelay("https://site.com/a", added.settings!);
    expect(result?.delayMs).toBe(280);
  });
});

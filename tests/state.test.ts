import { describe, expect, it } from "vitest";
import { getAppliedDelay } from "../src/core/matcher";
import {
  addRule,
  createInitialSettings,
  deleteRule,
  setRuleEnabled,
  updateGlobalDelay,
  updateRuleDelay
} from "../src/core/state";

describe("state", () => {
  it("cria regra com delay próprio", () => {
    const settings = createInitialSettings();
    const result = addRule(settings, {
      type: "exact",
      value: "https://api.exemplo.com/users",
      delayInput: "900"
    });

    expect(result.ok).toBe(true);
    expect(result.settings?.rules).toHaveLength(1);
    expect(result.settings?.rules[0].delayMs).toBe(900);
  });

  it("usa delay global como padrão quando delay da regra não é informado", () => {
    const settings = createInitialSettings();
    const changed = updateGlobalDelay(settings, "1300");

    const result = addRule(changed.settings!, {
      type: "exact",
      value: "https://api.exemplo.com/users"
    });

    expect(result.ok).toBe(true);
    expect(result.settings?.rules[0].delayMs).toBe(1300);
  });

  it("exclui regra", () => {
    const added = addRule(createInitialSettings(), {
      type: "exact",
      value: "https://api.exemplo.com/users",
      delayInput: "200"
    });

    const id = added.settings!.rules[0].id;
    const result = deleteRule(added.settings!, id);

    expect(result.settings?.rules).toHaveLength(0);
  });

  it("ativa e pausa regra", () => {
    const added = addRule(createInitialSettings(), {
      type: "exact",
      value: "https://api.exemplo.com/users",
      delayInput: "200"
    });

    const id = added.settings!.rules[0].id;

    const paused = setRuleEnabled(added.settings!, id, false);
    expect(paused.settings?.rules[0].enabled).toBe(false);

    const active = setRuleEnabled(paused.settings!, id, true);
    expect(active.settings?.rules[0].enabled).toBe(true);
  });

  it("atualiza delay da regra e aplica imediatamente nas próximas requisições", () => {
    const added = addRule(createInitialSettings(), {
      type: "exact",
      value: "https://api.exemplo.com/users",
      delayInput: "200"
    });

    const id = added.settings!.rules[0].id;
    const before = getAppliedDelay("https://api.exemplo.com/users", added.settings!);
    expect(before?.delayMs).toBe(200);

    const updated = updateRuleDelay(added.settings!, id, "1100");
    const after = getAppliedDelay("https://api.exemplo.com/users", updated.settings!);
    expect(after?.delayMs).toBe(1100);
  });

  it("valida regex inválida", () => {
    const result = addRule(createInitialSettings(), {
      type: "regex",
      value: "(",
      delayInput: "100"
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Regex inválida");
  });

  it("valida campo vazio", () => {
    const result = addRule(createInitialSettings(), {
      type: "exact",
      value: "   ",
      delayInput: "100"
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Informe");
  });

  it("valida delay negativo", () => {
    const result = addRule(createInitialSettings(), {
      type: "exact",
      value: "https://api.exemplo.com/users",
      delayInput: "-1"
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("negativo");
  });
});

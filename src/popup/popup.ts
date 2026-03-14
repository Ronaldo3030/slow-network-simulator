import { isRuleValid } from "../core/matcher";
import type { DelayRule, ExtensionSettings, RuleType } from "../core/types";

const webext = (
  (globalThis as unknown as { browser?: typeof browser; chrome?: typeof browser }).browser ??
  (globalThis as unknown as { browser?: typeof browser; chrome?: typeof browser }).chrome
) as typeof browser;

if (!webext) {
  throw new Error("WebExtension API indisponivel.");
}

type RuntimeResponse = {
  ok: boolean;
  error?: string;
  settings: ExtensionSettings;
  affectedRequests: number;
  activeRules: number;
};

const globalEnabledInput = document.querySelector<HTMLInputElement>("#global-enabled");
const globalStatus = document.querySelector<HTMLSpanElement>("#global-status");
const form = document.querySelector<HTMLFormElement>("#rule-form");
const ruleTypeInput = document.querySelector<HTMLSelectElement>("#rule-type");
const ruleValueInput = document.querySelector<HTMLInputElement>("#rule-value");
const ruleDelayInput = document.querySelector<HTMLInputElement>("#rule-delay");
const formError = document.querySelector<HTMLParagraphElement>("#form-error");
const rulesList = document.querySelector<HTMLDivElement>("#rules-list");
const rulesCount = document.querySelector<HTMLSpanElement>("#rules-count");
const activeRules = document.querySelector<HTMLElement>("#active-rules");
const affectedRequests = document.querySelector<HTMLElement>("#affected-requests");
const resetCounterBtn = document.querySelector<HTMLButtonElement>("#reset-counter");

function ensureElements(): void {
  const required = [
    globalEnabledInput,
    globalStatus,
    form,
    ruleTypeInput,
    ruleValueInput,
    ruleDelayInput,
    formError,
    rulesList,
    rulesCount,
    activeRules,
    affectedRequests,
    resetCounterBtn
  ];

  if (required.some((item) => !item)) {
    throw new Error("Elementos do popup nao encontrados.");
  }
}

ensureElements();

async function sendMessage(payload: Record<string, unknown>): Promise<RuntimeResponse> {
  return webext.runtime.sendMessage(payload) as Promise<RuntimeResponse>;
}

function setError(message: string): void {
  formError!.textContent = message;
}

function clearError(): void {
  setError("");
}

function updateRulePlaceholder(ruleType: RuleType): void {
  if (ruleType === "regex") {
    ruleValueInput!.placeholder = "^https://api\\.exemplo\\.com/.+\\.json$";
  } else {
    ruleValueInput!.placeholder = "https://api.exemplo.com/v1/users";
  }
}

function getRuleStateLabel(rule: DelayRule): string {
  if (!isRuleValid(rule)) {
    return "Invalida";
  }
  if (!rule.enabled) {
    return "Pausada";
  }
  return "Ativa";
}

async function onSetRuleEnabled(id: string, enabled: boolean): Promise<void> {
  const response = await sendMessage({ type: "SET_RULE_ENABLED", id, enabled });
  if (!response.ok) {
    setError(response.error ?? "Falha ao alterar status da regra.");
    return;
  }
  applyState(response);
}

async function onDeleteRule(id: string): Promise<void> {
  const response = await sendMessage({ type: "DELETE_RULE", id });
  if (!response.ok) {
    setError(response.error ?? "Falha ao excluir regra.");
    return;
  }
  applyState(response);
}

async function onUpdateRuleDelay(id: string, delayInputValue: string): Promise<void> {
  const response = await sendMessage({ type: "UPDATE_RULE_DELAY", id, delayInput: delayInputValue });
  if (!response.ok) {
    setError(response.error ?? "Falha ao atualizar delay.");
    return;
  }
  applyState(response);
}

function renderRules(rules: DelayRule[]): void {
  rulesList!.innerHTML = "";
  rulesCount!.textContent = `${rules.length} regra(s)`;

  if (!rules.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nenhuma regra cadastrada.";
    rulesList!.appendChild(empty);
    return;
  }

  for (const rule of rules) {
    const valid = isRuleValid(rule);

    const card = document.createElement("article");
    card.className = "rule-card";
    if (!rule.enabled) {
      card.classList.add("paused");
    }
    if (!valid) {
      card.classList.add("invalid");
    }

    const top = document.createElement("div");
    top.className = "card-top";

    const badge = document.createElement("span");
    badge.className = "type-badge";
    badge.textContent = rule.type;

    const state = document.createElement("span");
    state.className = "rule-state";
    state.textContent = getRuleStateLabel(rule);

    const delayRow = document.createElement("div");
    delayRow.className = "card-delay";

    const delayInput = document.createElement("input");
    delayInput.type = "number";
    delayInput.min = "1";
    delayInput.value = String(rule.delayMs);

    delayInput.addEventListener("focus", () => {
      card.classList.add("editing");
    });

    delayInput.addEventListener("blur", () => {
      card.classList.remove("editing");
    });

    delayInput.addEventListener("change", () => {
      void onUpdateRuleDelay(rule.id, delayInput.value);
    });

    delayInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        delayInput.blur();
      }
    });

    const ms = document.createElement("span");
    ms.className = "ms-label";
    ms.textContent = "ms";

    delayRow.append(delayInput, ms, state);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "icon-btn pause-btn";
    pauseBtn.textContent = rule.enabled ? "Pausar" : "Retomar";
    pauseBtn.disabled = !valid;
    pauseBtn.addEventListener("click", () => {
      void onSetRuleEnabled(rule.id, !rule.enabled);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-btn delete-btn";
    deleteBtn.textContent = "Excluir";
    deleteBtn.addEventListener("click", () => {
      void onDeleteRule(rule.id);
    });

    actions.append(pauseBtn, deleteBtn);

    const ruleValue = document.createElement("div");
    ruleValue.className = "rule-value";
    ruleValue.textContent = rule.value;

    top.append(badge, actions);
    card.append(top, ruleValue, delayRow);
    rulesList!.appendChild(card);
  }
}

function applyState(response: RuntimeResponse): void {
  clearError();

  globalEnabledInput!.checked = response.settings.globalEnabled;
  globalStatus!.textContent = response.settings.globalEnabled ? "Ativo" : "Pausado";
  globalStatus!.style.color = response.settings.globalEnabled ? "var(--accent)" : "#d6c17d";

  renderRules(response.settings.rules);
  activeRules!.textContent = String(response.activeRules);
  affectedRequests!.textContent = String(response.affectedRequests);
}

async function refresh(): Promise<void> {
  const response = await sendMessage({ type: "GET_STATE" });
  applyState(response);
}

ruleTypeInput!.addEventListener("change", () => {
  updateRulePlaceholder(ruleTypeInput!.value === "regex" ? "regex" : "exact");
});

globalEnabledInput!.addEventListener("change", async () => {
  const response = await sendMessage({
    type: "SET_GLOBAL_ENABLED",
    enabled: globalEnabledInput!.checked
  });

  if (!response.ok) {
    setError(response.error ?? "Falha ao alterar status global.");
    return;
  }

  applyState(response);
});

form!.addEventListener("submit", async (event) => {
  event.preventDefault();

  const delayRaw = ruleDelayInput!.value.trim();

  const payload = {
    type: "ADD_RULE",
    ruleType: ruleTypeInput!.value,
    value: ruleValueInput!.value,
    delayInput: delayRaw || "2000"
  };

  const response = await sendMessage(payload);
  if (!response.ok) {
    setError(response.error ?? "Falha ao adicionar regra.");
    return;
  }

  ruleValueInput!.value = "";
  ruleDelayInput!.value = "";
  applyState(response);
});

resetCounterBtn!.addEventListener("click", async () => {
  const response = await sendMessage({ type: "RESET_SESSION_COUNTER" });
  if (!response.ok) {
    setError(response.error ?? "Falha ao limpar contador.");
    return;
  }
  applyState(response);
});

updateRulePlaceholder("regex");
void refresh();

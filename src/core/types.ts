export type RuleType = "exact" | "regex";

export interface DelayRule {
  id: string;
  type: RuleType;
  value: string;
  delayMs: number;
  enabled: boolean;
  createdAt: number;
}

export interface ExtensionSettings {
  globalEnabled: boolean;
  globalDelayMs: number;
  rules: DelayRule[];
}

export interface RuntimeState {
  settings: ExtensionSettings;
  affectedRequests: number;
}

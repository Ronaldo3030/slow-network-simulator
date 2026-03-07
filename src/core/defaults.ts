import type { ExtensionSettings } from "./types";

export const STORAGE_KEY = "requestDelaySettings";

export const MIN_DELAY_MS = 1;
export const MAX_DELAY_MS = 5000;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  globalEnabled: true,
  globalDelayMs: 500,
  rules: []
};

export const PRESETS: Array<{ id: string; label: string; delayMs: number }> = [
  { id: "slow3g", label: "3G Lento", delayMs: 1200 },
  { id: "4g", label: "4G", delayMs: 250 },
  { id: "wifi", label: "Wi-Fi", delayMs: 80 },
  { id: "offline", label: "Offline", delayMs: 5000 }
];

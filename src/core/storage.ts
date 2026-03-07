import { STORAGE_KEY } from "./defaults";
import type { ExtensionSettings } from "./types";
import { sanitizeSettings } from "./state";

export interface StorageAreaLike {
  get: (key: string) => Promise<unknown> | unknown;
  set: (value: Record<string, unknown>) => Promise<void> | void;
}

export async function loadSettings(storage: StorageAreaLike): Promise<ExtensionSettings> {
  const raw = await storage.get(STORAGE_KEY);

  if (!raw || typeof raw !== "object") {
    return sanitizeSettings(undefined);
  }

  const payload = (raw as Record<string, unknown>)[STORAGE_KEY];
  return sanitizeSettings(payload);
}

export async function saveSettings(storage: StorageAreaLike, settings: ExtensionSettings): Promise<void> {
  await storage.set({ [STORAGE_KEY]: settings });
}

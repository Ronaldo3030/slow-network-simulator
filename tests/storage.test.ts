import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../src/core/defaults";
import { createInitialSettings } from "../src/core/state";
import { loadSettings, saveSettings, type StorageAreaLike } from "../src/core/storage";

class MemoryStorage implements StorageAreaLike {
  private data: Record<string, unknown> = {};

  get(key: string): unknown {
    return { [key]: this.data[key] };
  }

  set(value: Record<string, unknown>): void {
    this.data = { ...this.data, ...value };
  }
}

describe("storage", () => {
  it("salva e recupera configurações localmente", async () => {
    const storage = new MemoryStorage();
    const settings = createInitialSettings();
    settings.globalDelayMs = 999;

    await saveSettings(storage, settings);
    const loaded = await loadSettings(storage);

    expect(loaded.globalDelayMs).toBe(999);
  });

  it("recupera padrão quando storage está vazio", async () => {
    const storage = new MemoryStorage();
    const loaded = await loadSettings(storage);

    expect(loaded.rules).toEqual([]);
    expect(loaded.globalDelayMs).toBeGreaterThan(0);
  });

  it("mantém persistência de regras", async () => {
    const storage = new MemoryStorage();

    storage.set({
      [STORAGE_KEY]: {
        globalEnabled: true,
        globalDelayMs: 450,
        rules: [
          {
            id: "r1",
            type: "exact",
            value: "https://api.exemplo.com/a",
            delayMs: 450,
            enabled: true,
            createdAt: 1
          }
        ]
      }
    });

    const loaded = await loadSettings(storage);
    expect(loaded.rules).toHaveLength(1);
    expect(loaded.rules[0].value).toContain("api.exemplo.com");
  });
});

// scripts/check-adapter-event-values.ts
// Run after the adapter's switch, text field and chip-set user actions.
import assert from "node:assert/strict";
import type { Page } from "playwright";

export const checkAdapterEventValues = async (page: Page): Promise<void> => {
  const seen = await page.evaluate(() => {
    const api = (window as unknown as { api: {
      modelLog: Array<{ id: string; detail: unknown; host: unknown }>;
    } }).api;
    return Object.fromEntries(api.modelLog.map(({ id, detail, host }) => [id, { detail, host }]));
  });
  assert.deepEqual(seen, {
    boolean: { detail: false, host: false },
    string: { detail: "Ada", host: "Ada" },
    array: { detail: ["veg", "gf"], host: ["veg", "gf"] },
  });
};

import { expect, mock, test } from "bun:test";
import type { Page } from "playwright";
import { captureSsrScreenshot } from "../../scripts/ssr-screenshot";

const path = "analysis/ssr-upgrade/chromium/button-before.png";
const options = { path, animations: "disabled" as const };
const captureFailure = () => new Error(
  "screenshot: Protocol error (Page.captureScreenshot): Unable to capture screenshot\nCall log:\n  - taking page screenshot",
);

function captures(...outcomes: (Error | Buffer)[]) {
  return mock(async (_options?: Parameters<Page["screenshot"]>[0]) => {
    const outcome = outcomes.shift();
    if (outcome instanceof Error) throw outcome;
    if (!outcome) throw new Error("Unexpected screenshot attempt");
    return outcome;
  });
}

test("returns the first screenshot unchanged", async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const screenshot = captures(png);
  expect(await captureSsrScreenshot({ screenshot }, path)).toBe(png);
  expect(screenshot.mock.calls).toEqual([[options]]);
});

test("retries a Chromium capture error with the same options", async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const screenshot = captures(captureFailure(), png);
  expect(await captureSsrScreenshot({ screenshot }, path)).toBe(png);
  expect(screenshot.mock.calls).toEqual([[options], [options]]);
});

test("propagates a second capture failure", async () => {
  const last = captureFailure();
  const screenshot = captures(captureFailure(), last);
  await expect(captureSsrScreenshot({ screenshot }, path)).rejects.toBe(last);
  expect(screenshot.mock.calls).toHaveLength(2);
});

test("propagates an unrelated screenshot error immediately", async () => {
  const closed = new Error("page.screenshot: Target page, context or browser has been closed");
  const screenshot = captures(closed);
  await expect(captureSsrScreenshot({ screenshot }, path)).rejects.toBe(closed);
  expect(screenshot.mock.calls).toHaveLength(1);
});

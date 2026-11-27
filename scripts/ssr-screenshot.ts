import type { Page } from "playwright";

const captureFailure = "Protocol error (Page.captureScreenshot): Unable to capture screenshot";

export async function captureSsrScreenshot(page: Pick<Page, "screenshot">, path: string): Promise<Buffer> {
  const options = { path, animations: "disabled" as const };
  try {
    return await page.screenshot(options);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes(captureFailure)) throw error;
    console.log(`Retrying SSR screenshot ${path} after a Chromium capture error`);
  }
  return page.screenshot(options);
}

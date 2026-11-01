// scripts/check-compose-icon-browser.ts
/** The exported `withIcon` places its icon after a label named by data. */
import assert from "node:assert/strict";
import type { Page } from "playwright";

/**
 * A componentName or a prefix carrying a quote or a backslash is data, not
 * selector syntax. Through the public `material/core/compose` surface the
 * label lookup must compare the literal class token, never interpolate a
 * selector: Chromium throws on the quote and, on the backslash, silently
 * matches nothing, so the icon lands before the label. The placement is
 * Material's own — a leading icon sits with the label it names, as the
 * buttons guidelines place icon and text as one row (m3.material.io/
 * components/buttons/guidelines, read 2026-11-01). This guard pins the
 * after-label placement for hostile names and hostile prefixes alike,
 * beside a plain control, without a selector anywhere in the measurement.
 */
export async function checkComposeIconLabel(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const withIcon = (window as unknown as { withIcon: (config: Record<string, string>) => (component: { element: HTMLElement }) => { icon: { setIcon: (html: string) => unknown } } }).withIcon;
    const cases = [
      { key: "nameQuote", prefix: undefined as string | undefined, name: 'a"b' },
      { key: "nameBackslash", prefix: undefined as string | undefined, name: "a\\b" },
      { key: "prefixQuote", prefix: 'p"q', name: "card" },
      { key: "prefixBackslash", prefix: "p\\q", name: "card" },
      { key: "plain", prefix: undefined as string | undefined, name: "card" },
    ];
    const out: Record<string, { threw: string | null; hasIcon: boolean; iconAfterLabel: boolean }> = {};
    for (const testCase of cases) {
      const element = document.createElement("div");
      const label = document.createElement("span");
      const prefix = testCase.prefix ?? "mtrl";
      label.className = `${prefix}-${testCase.name}__label`;
      element.appendChild(label);
      document.body.appendChild(element);
      let threw: string | null = null;
      let hasIcon = false;
      let iconAfterLabel = false;
      try {
        const enhanced = withIcon({ prefix: testCase.prefix, componentName: testCase.name })({ element });
        enhanced.icon.setIcon("<i>x</i>");
        // No selector in the measurement: the icon, when it landed, is the
        // label's next sibling and carries the prefix's own token.
        const icon = label.nextElementSibling;
        hasIcon = !!icon && (icon as HTMLElement).classList.contains(`${prefix}-icon`);
        iconAfterLabel = hasIcon && !!(icon && icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_PRECEDING);
      } catch (error) {
        threw = error instanceof Error ? error.message : String(error);
      }
      out[testCase.key] = { threw, hasIcon, iconAfterLabel };
      element.remove();
    }
    return out;
  });

  for (const key of ["nameQuote", "nameBackslash", "prefixQuote", "prefixBackslash"]) {
    assert.deepEqual(result[key], { threw: null, hasIcon: true, iconAfterLabel: true },
      `withIcon ${key}: the hostile value must reach its label and place the icon after it`);
  }
  assert.deepEqual(result.plain, { threw: null, hasIcon: true, iconAfterLabel: true },
    "withIcon plain: the control keeps the after-label placement");
}

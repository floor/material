/** Browser geometry for highlighted suggestion headlines and their supporting line. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import type { Page } from "playwright";
import type createSearch from "../src/components/search";

export async function checkSearchSuggestionLayout(page: Page, form: "factory" | "element"): Promise<void> {
  const suggestions = [
    { text: "Apple pie", supportingText: "Match at the start" },
    { text: "Pineapple tart", supportingText: "Match in the middle" },
    { text: "Crabapple", supportingText: "Match at the end" },
    { text: "Apple apple pie", supportingText: "Repeated phrase" },
    { text: "A plain pear", supportingText: "No match" },
    { text: "Pineapple tart" },
    { text: "Apple " + "a long headline ".repeat(12), supportingText: "A long supporting line ".repeat(12) },
  ];
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mkdir("analysis/browser", { recursive: true });
  for (const dir of ["ltr", "rtl"] as const) {
    await page.evaluate(({ form, suggestions, dir }) => {
      const stage = document.createElement("div");
      stage.id = "suggestion-layout";
      stage.dir = dir;
      stage.style.width = "360px";
      document.body.prepend(stage);
      if (form === "element") {
        const host = document.createElement("m-search");
        host.setAttribute("value", "apple");
        stage.append(host);
        // The element's public component accepts the factory's richer suggestion data.
        const component = (host as HTMLElement & { component: { setSuggestions: (items: typeof suggestions) => void } }).component;
        component.setSuggestions(suggestions);
        host.setAttribute("open", "");
      } else {
        const state = window as unknown as { createSearch: typeof createSearch };
        const search = state.createSearch({ value: "apple", suggestions, collapseOnBlur: false });
        Object.assign(stage, { search });
        stage.append(search.element);
        search.expand();
      }
    }, { form, suggestions, dir });
    try {
      const rows = page.locator("#suggestion-layout .mtrl-search__suggestion-item");
      await rows.first().waitFor({ state: "visible" });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const measured = await rows.evaluateAll(items => items.map(item => {
        const label = item.querySelector(".mtrl-search__suggestion-text") as HTMLElement;
        const supporting = label.querySelector(".mtrl-search__suggestion-supporting") as HTMLElement | null;
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        const headline: { text: string; top: number; bottom: number }[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (supporting?.contains(node) || !node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) headline.push({ text: node.textContent, top: rect.top, bottom: rect.bottom });
        }
        const support = supporting?.getBoundingClientRect();
        return {
          height: item.getBoundingClientRect().height,
          headline,
          matches: [...label.querySelectorAll("strong")].map(match => ({ text: match.textContent, weight: getComputedStyle(match).fontWeight })),
          supporting: support ? { top: support.top, bottom: support.bottom, width: support.width } : null,
          width: label.getBoundingClientRect().width,
          textOverflow: getComputedStyle(label).textOverflow,
        };
      }));
      await writeFile(`analysis/browser/search-suggestions-${form}-${dir}.json`, JSON.stringify(measured, null, 2) + "\n");
      await page.screenshot({ path: `analysis/browser/search-suggestions-${form}-${dir}.png` });
      assert.equal(measured.length, suggestions.length);
      for (const [index, row] of measured.entries()) {
        const name = `${form} ${dir} suggestion ${index}: ${suggestions[index].text.slice(0, 25)}`;
        assert.equal(new Set(row.headline.map(part => Math.round(part.top))).size, 1,
          `${name}: highlighted and plain headline fragments share one line; ${JSON.stringify(row.headline)}`);
        assert.equal(Math.round(row.height), suggestions[index].supportingText ? 72 : 56, `${name}: item height`);
        assert.equal(row.matches.length, [1, 1, 1, 1, 0, 1, 1][index], `${name}: highlighted matches`);
        assert.ok(row.matches.every(match => match.text?.toLowerCase() === "apple" && match.weight === "600"), `${name}: match stays emphasized`);
        if (row.supporting) {
          const end = Math.max(...row.headline.map(part => part.bottom));
          assert.ok(row.supporting.top >= end && row.supporting.top - end <= 8, `${name}: supporting text is directly below the headline`);
          assert.ok(row.supporting.width <= row.width + 1, `${name}: supporting line fits the label`);
        }
        assert.equal(row.textOverflow, "ellipsis", `${name}: overflowing text keeps truncation`);
      }
      console.log(`Passed ${form} ${dir}: seven suggestion rows keep highlighted headlines on one line and supporting text below.`);
    } finally {
      await page.evaluate(() => {
        const stage = document.getElementById("suggestion-layout") as (HTMLElement & { search?: { destroy: () => void } }) | null;
        stage?.search?.destroy();
        stage?.remove();
      });
    }
  }
}

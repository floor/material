#!/usr/bin/env bun
// Selected standard list item, divider inset, and standard leading media.
//
//   bun run scripts/check-list-conformance.ts
//
// The page is the list factory and the list stylesheet, compiled for this run.
// Light and dark in both directions and both engines.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium, webkit, type Browser } from "playwright";
import { compileString } from "sass";

const repoRoot = resolve(import.meta.dir, "..");
const css = compileString(`@use "themes/baseline"; @use "components/list";`, {
  loadPaths: [resolve(repoRoot, "src/styles")],
  style: "expanded",
}).css;

const bundle = await Bun.build({
  entrypoints: ["list-conformance-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^list-conformance-entry\.ts$/ }, () => ({
        path: resolve(repoRoot, "list-conformance-entry.ts"),
      }));
      build.onLoad({ filter: /list-conformance-entry\.ts$/ }, () => ({
        contents: `import createList from ${JSON.stringify(resolve(repoRoot, "src/components/list/list.ts"))};
window.createList = createList;`,
        loader: "ts",
      }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();

const corners = `(el) => {
  const s = getComputedStyle(el);
  return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].join(" ");
}`;

const check = async (browser: Browser, engine: string) => {
  const page = await browser.newPage({ viewport: { width: 480, height: 720 }, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
  await page.evaluate(() => {
    const createList = (window as unknown as { createList: (config: object) => { element: HTMLElement; selectItem: (id: string) => void } }).createList;
    const media = '<svg viewBox="0 0 24 24"><rect width="24" height="24" fill="currentColor"/></svg>';
    const items = () => [
      { id: "walk", headline: "Morning walk", supportingText: "Park loop", leading: { type: "image", content: media }, trailing: { type: "text", content: "6:30" } },
      { kind: "divider", inset: true },
      { id: "clip", headline: "Clip", leading: { type: "video", content: media } },
      { kind: "divider" },
      { id: "plain", headline: "Plain" },
    ];
    document.body.style.cssText = "margin:0;padding:16px";
    const standard = createList({ ariaLabel: "Standard", items: items() });
    const segmented = createList({ ariaLabel: "Segmented", variant: "segmented", items: items() });
    standard.selectItem("walk");
    segmented.selectItem("walk");
    standard.element.id = "standard";
    segmented.element.id = "segmented";
    document.body.append(standard.element, segmented.element);
  });

  const failures: string[] = [];
  let lightFill = "";
  let darkFill = "";
  for (const theme of ["light", "dark"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      const measured = await page.evaluate(({ theme, dir, corners }) => {
        document.documentElement.dir = dir;
        document.documentElement.setAttribute("data-theme-mode", theme);
        const read = new Function("el", `return (${corners})(el)`) as (el: Element) => string;
        const item = (root: string, id: string) => document.querySelector(`#${root} [data-id="${id}"]`) as HTMLElement;
        const leading = (root: string, id: string, kind: string) => item(root, id).querySelector(`.mtrl-list__leading--${kind}`) as HTMLElement;
        const divider = (root: string, inset: boolean) => document.querySelector(`#${root} .mtrl-list__divider${inset ? ".mtrl-list__divider--inset" : ":not(.mtrl-list__divider--inset)"}`) as HTMLElement;
        const box = (el: HTMLElement) => {
          const s = getComputedStyle(el);
          return { start: s.marginInlineStart, end: s.marginInlineEnd, left: s.marginLeft, right: s.marginRight };
        };
        const selected = item("standard", "walk");
        const insetDivider = divider("standard", true);
        const line = insetDivider.getBoundingClientRect();
        const content = insetDivider.parentElement!.getBoundingClientRect();
        return {
          list: read(document.querySelector("#standard")!),
          selected: read(selected),
          action: read(selected.querySelector(".mtrl-list__action")!),
          layer: read(selected.querySelector(".mtrl-list__action")!),
          layerBefore: getComputedStyle(selected.querySelector(".mtrl-list__action")!, "::before").borderTopLeftRadius,
          plain: read(item("standard", "plain")),
          image: getComputedStyle(leading("standard", "walk", "image")).borderTopLeftRadius,
          video: getComputedStyle(leading("standard", "clip", "video")).borderTopLeftRadius,
          fill: getComputedStyle(selected).backgroundColor,
          inset: {
            ...box(insetDivider),
            leftGap: line.left - content.left,
            rightGap: content.right - line.right,
          },
          full: box(divider("standard", false)),
          segmentedList: read(document.querySelector("#segmented")!),
          segmentedSelected: read(item("segmented", "walk")),
          segmentedImage: getComputedStyle(leading("segmented", "walk", "image")).borderTopLeftRadius,
          segmentedVideo: getComputedStyle(leading("segmented", "clip", "video")).borderTopLeftRadius,
          segmentedPlain: read(item("segmented", "plain")),
        };
      }, { theme, dir, corners });
      if (theme === "light") lightFill = measured.fill;
      if (theme === "dark") darkFill = measured.fill;
      const expectEqual = (name: string, got: string, want: string) => {
        if (got !== want) failures.push(`${theme} ${dir} ${name}: ${got} !== ${want}`);
      };
      expectEqual("list box", measured.list, "0px 0px 0px 0px");
      expectEqual("selected standard item", measured.selected, "16px 16px 16px 16px");
      expectEqual("selected action", measured.action, "16px 16px 16px 16px");
      expectEqual("selected state layer", measured.layerBefore, "16px");
      expectEqual("unselected standard item", measured.plain, "0px 0px 0px 0px");
      expectEqual("standard image", measured.image, "0px");
      expectEqual("standard video", measured.video, "0px");
      expectEqual("inset start", measured.inset.start, "16px");
      expectEqual("inset end", measured.inset.end, "16px");
      expectEqual("inset left", measured.inset.left, "16px");
      expectEqual("inset right", measured.inset.right, "16px");
      expectEqual("divider left gap", String(measured.inset.leftGap), "16");
      expectEqual("divider right gap", String(measured.inset.rightGap), "16");
      expectEqual("full divider start", measured.full.start, "0px");
      expectEqual("full divider end", measured.full.end, "0px");
      expectEqual("segmented list box", measured.segmentedList, "0px 0px 0px 0px");
      expectEqual("segmented selected item", measured.segmentedSelected, "16px 16px 16px 16px");
      expectEqual("segmented image", measured.segmentedImage, "8px");
      expectEqual("segmented video", measured.segmentedVideo, "8px");
    }
  }
  assert.deepEqual(errors, [], `${engine}: page errors`);
  assert.notEqual(lightFill, darkFill, `${engine}: dark theme did not change the selected fill`);
  if (failures.length === 0) console.log(`${engine}: list conformance, divider 16 px on both sides in LTR and RTL`);
  return failures.map(failure => `${engine} ${failure}`);
};

const failures: string[] = [];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true });
  try {
    failures.push(...await check(browser, engine.name()));
  } finally {
    await browser.close();
  }
}
assert.deepEqual(failures, []);

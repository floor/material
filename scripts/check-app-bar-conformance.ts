#!/usr/bin/env bun
/**
 * The app-bar conformance rows, measured in Chromium.
 *
 * Each assertion names the row of the 2026-11-18 conformance confirmation it
 * closes, and the token or rule that sets the value:
 *
 * - P1 top app bar: the scrolled bar's elevation is Level2
 *   (OnScrollContainerElevation, tokens/AppBarTokens.kt:34).
 * - P2 top app bar: the leading icon takes OnSurface and the trailing one
 *   OnSurfaceVariant (LeadingIconColor / TrailingIconColor, tokens/AppBarTokens.kt:31,37),
 *   and a slotted bare button takes its slot's colour rather than the page's.
 * - P3 top app bar: scrolled, a medium compressible bar keeps its navigation and
 *   actions reachable beside the title at 64dp (TwoRowsTopAppBar,
 *   AppBar.kt:2755-2860; app-bars accessibility).
 * - P5 top app bar: without a leading icon the title is inset 16dp, not 40dp
 *   (TopAppBarHorizontalPadding 4 + TopAppBarTitleInset 12, AppBar.kt:3512-3516),
 *   in both directions.
 * - P8 bottom app bar: actions take OnSurfaceVariant (MDC BottomAppBar.md:80).
 * - P10 docked toolbar: items keep ContainerMinSpacing 4dp
 *   (tokens/DockedToolbarTokens.kt:31).
 * - P11 navigation bar: the horizontal active label keeps ItemActiveLabelTextColor
 *   Secondary (tokens/NavigationBarTokens.kt:31).
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

const entrySource = `
import { createTopAppBar, createBottomAppBar, createToolbar, createNavigationBar, createIconButton } from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineAll, registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/index.ts"))};
registerStyles({ "top-app-bar": ${JSON.stringify(compile("components/top-app-bar"))}, "bottom-app-bar": ${JSON.stringify(compile("components/bottom-app-bar"))} });
defineAll();
window.api = { createTopAppBar, createBottomAppBar, createToolbar, createNavigationBar, createIconButton };
`;
const bundleBuild = await Bun.build({
  entrypoints: ["app-bar-conformance-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^app-bar-conformance-entry\.ts$/ }, () => ({ path: resolve(repoRoot, "app-bar-conformance-entry.ts") }));
      build.onLoad({ filter: /app-bar-conformance-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundleBuild.success, String(bundleBuild.logs));

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 600 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: compile("main") });
  await page.addScriptTag({ content: await bundleBuild.outputs[0]!.text() });

  type Row = { name: string; run: () => Promise<void> };
  const rows: Row[] = [];

  /** A probe element resolving a system role, the reference every colour row reads. */
  const probe = (role: string): Promise<string> => page.evaluate((role) => {
    const span = document.createElement("span");
    span.style.color = `var(--mtrl-sys-color-${role})`;
    document.body.append(span);
    const colour = getComputedStyle(span).color;
    span.remove();
    return colour;
  }, role);

  rows.push({
    name: "P1 top app bar scrolled elevation is Level2",
    run: async () => {
      const resting = await page.evaluate(() => {
        const api = (window as unknown as { api: Record<string, unknown> }).api as Record<string, (config: Record<string, unknown>) => Record<string, unknown>>;
        document.body.replaceChildren();
        const bar = api.createTopAppBar!({ title: "Title" }) as unknown as { element: HTMLElement; setScrollState: (value: boolean) => void };
        document.body.append(bar.element);
        const reference = api.createBottomAppBar!({}) as unknown as { element: HTMLElement };
        document.body.append(reference.element);
        const shadow = getComputedStyle(bar.element).boxShadow;
        bar.setScrollState(true);
        return { shadow, level2: getComputedStyle(reference.element).boxShadow };
      });
      // The bar transitions its shadow: read it once the transition has run.
      await page.waitForFunction(() => document.getAnimations().length === 0 || document.getAnimations().every((animation) => animation.playState === "finished"));
      const scrolled = await page.evaluate(() =>
        getComputedStyle(document.querySelector<HTMLElement>(".mtrl-top-app-bar")!).boxShadow);
      assert.equal(resting.shadow, "none", `P1: the resting bar has an elevation: ${resting.shadow}`);
      assert.notEqual(scrolled, "none", "P1: the scrolled bar has no elevation");
      assert.equal(scrolled, resting.level2, `P1: the scrolled bar's elevation is ${scrolled}, not the Level2 ${resting.level2}`);
      assert.notEqual(scrolled, resting.shadow);
    },
  });

  rows.push({
    name: "P2 leading OnSurface, trailing OnSurfaceVariant, bare children take the slot's colour",
    run: async () => {
      const [onSurface, onSurfaceVariant] = [await probe("on-surface"), await probe("on-surface-variant")];
      const measured = await page.evaluate(() => {
        const api = (window as unknown as { api: Record<string, unknown> }).api as Record<string, (config: Record<string, unknown>) => Record<string, unknown>>;
        document.body.replaceChildren();
        const bar = api.createTopAppBar!({ title: "Title" }) as unknown as {
          element: HTMLElement;
          addLeadingElement: (element: HTMLElement) => void;
          addTrailingElement: (element: HTMLElement) => void;
        };
        document.body.append(bar.element);
        const leadingIcon = api.createIconButton!({ icon: "<svg></svg>", ariaLabel: "Back" }) as unknown as { element: HTMLElement };
        const trailingIcon = api.createIconButton!({ icon: "<svg></svg>", ariaLabel: "More" }) as unknown as { element: HTMLElement };
        const bare = document.createElement("button");
        bare.textContent = "Bare";
        bar.addLeadingElement(leadingIcon.element);
        bar.addLeadingElement(bare);
        bar.addTrailingElement(trailingIcon.element);
        return {
          leadingIcon: getComputedStyle(leadingIcon.element).color,
          leadingBare: getComputedStyle(bare).color,
          trailingIcon: getComputedStyle(trailingIcon.element).color,
        };
      });
      assert.equal(measured.leadingIcon, onSurface, `P2: the leading icon is ${measured.leadingIcon}, not OnSurface`);
      assert.equal(measured.leadingBare, onSurface, `P2: a bare leading button is ${measured.leadingBare}, not OnSurface`);
      assert.equal(measured.trailingIcon, onSurfaceVariant, `P2: the trailing icon is ${measured.trailingIcon}, not OnSurfaceVariant`);
    },
  });

  rows.push({
    name: "P3 a scrolled medium bar keeps navigation and actions reachable",
    run: async () => {
      const measured = await page.evaluate(() => {
        const api = (window as unknown as { api: Record<string, unknown> }).api as Record<string, (config: Record<string, unknown>) => Record<string, unknown>>;
        document.body.replaceChildren();
        const bar = api.createTopAppBar!({ title: "Title", type: "medium", compressible: true }) as unknown as {
          element: HTMLElement;
          setScrollState: (value: boolean) => void;
          addLeadingElement: (element: HTMLElement) => void;
          addTrailingElement: (element: HTMLElement) => void;
          getLeadingContainer: () => HTMLElement;
          getTrailingContainer: () => HTMLElement;
          getHeadlineElement: () => HTMLElement;
        };
        document.body.append(bar.element);
        const leading = document.createElement("button");
        leading.textContent = "Nav";
        const trailing = document.createElement("button");
        trailing.textContent = "Act";
        bar.addLeadingElement(leading);
        bar.addTrailingElement(trailing);
        bar.setScrollState(true);
        const box = bar.element.getBoundingClientRect();
        const headline = bar.getHeadlineElement();
        const read = (element: HTMLElement) => ({
          rects: element.getClientRects().length,
          left: Math.round(element.getBoundingClientRect().left - box.left),
          focusable: element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden",
        });
        return {
          height: Math.round(box.height),
          leading: read(leading),
          trailing: read(trailing),
          headline: read(headline),
          text: headline.textContent,
        };
      });
      assert.equal(measured.height, 64, `P3: the scrolled bar is ${measured.height}px, not 64`);
      assert.equal(measured.leading.rects > 0, true, "P3: the navigation is not rendered when scrolled");
      assert.equal(measured.trailing.rects > 0, true, "P3: the actions are not rendered when scrolled");
      assert.equal(measured.headline.rects > 0, true, "P3: the title is not rendered when scrolled");
      assert.equal(measured.text, "Title");
      assert.ok(measured.leading.left < measured.headline.left && measured.headline.left < measured.trailing.left,
        `P3: the row order is leading ${measured.leading.left}, title ${measured.headline.left}, trailing ${measured.trailing.left}`);
    },
  });

  rows.push({
    name: "P5 a title without a leading icon is inset 16dp, in both directions",
    run: async () => {
      for (const dir of ["ltr", "rtl"] as const) {
        const inset = await page.evaluate((dir) => {
          const api = (window as unknown as { api: Record<string, unknown> }).api as Record<string, (config: Record<string, unknown>) => Record<string, unknown>>;
          document.body.replaceChildren();
          document.documentElement.dir = dir;
          const bar = api.createTopAppBar!({ title: "Title" }) as unknown as {
            element: HTMLElement;
            getHeadlineElement: () => HTMLElement;
          };
          document.body.append(bar.element);
          const box = bar.element.getBoundingClientRect();
          const headline = bar.getHeadlineElement().getBoundingClientRect();
          return Math.round(dir === "rtl" ? box.right - headline.right : headline.left - box.left);
        }, dir);
        assert.equal(inset, 16, `P5 (${dir}): the title is inset ${inset}px from the bar's edge, not 16`);
      }
      await page.evaluate(() => { document.documentElement.dir = "ltr"; });
    },
  });

  rows.push({
    name: "P8 bottom app bar actions take OnSurfaceVariant",
    run: async () => {
      const onSurfaceVariant = await probe("on-surface-variant");
      const measured = await page.evaluate(() => {
        const api = (window as unknown as { api: Record<string, unknown> }).api as Record<string, (config: Record<string, unknown>) => Record<string, unknown>>;
        document.body.replaceChildren();
        const bar = api.createBottomAppBar!({}) as unknown as { element: HTMLElement; getActionsContainer: () => HTMLElement };
        document.body.append(bar.element);
        const bare = document.createElement("button");
        bare.textContent = "Action";
        bar.getActionsContainer().append(bare);
        return getComputedStyle(bare).color;
      });
      assert.equal(measured, onSurfaceVariant, `P8: a bare action button is ${measured}, not OnSurfaceVariant`);
    },
  });

  rows.push({
    name: "P10 docked toolbar keeps 4dp between crowded items",
    run: async () => {
      const gaps = await page.evaluate(() => {
        const api = (window as unknown as { api: Record<string, unknown> }).api as Record<string, (config: Record<string, unknown>) => Record<string, unknown>>;
        document.body.replaceChildren();
        const toolbar = api.createToolbar!({
          variant: "docked",
          placement: "bottom",
          items: Array.from({ length: 24 }, (_, index) => ({ label: `Item ${index}` })),
        }) as unknown as { element: HTMLElement };
        document.body.append(toolbar.element);
        const buttons = Array.from(toolbar.element.querySelectorAll<HTMLElement>(".mtrl-toolbar__bar > *"));
        return buttons.slice(1).map((button, index) => Math.round(button.getBoundingClientRect().left - buttons[index]!.getBoundingClientRect().right));
      });
      assert.ok(gaps.length > 20, `P10: ${gaps.length} items measured`);
      assert.equal(Math.min(...gaps), 4, `P10: the smallest gap between adjacent items is ${Math.min(...gaps)}px, not 4`);
    },
  });

  rows.push({
    name: "P11 the horizontal active label keeps Secondary",
    run: async () => {
      const secondary = await probe("secondary");
      const measured = await page.evaluate(() => {
        const api = (window as unknown as { api: Record<string, unknown> }).api as Record<string, (config: Record<string, unknown>) => Record<string, unknown>>;
        document.body.replaceChildren();
        const bar = api.createNavigationBar!({
          itemLayout: "horizontal",
          items: [
            { id: "home", label: "Home", icon: "<svg></svg>" },
            { id: "search", label: "Search", icon: "<svg></svg>" },
            { id: "profile", label: "Profile", icon: "<svg></svg>" },
          ],
        }) as unknown as { element: HTMLElement; setActive: (id: string) => void };
        document.body.append(bar.element);
        bar.setActive("search");
        const label = bar.element.querySelector<HTMLElement>(".mtrl-navigation-bar__item--active .mtrl-navigation-bar__label");
        return label ? getComputedStyle(label).color : null;
      });
      assert.ok(measured, "P11: no horizontal active label");
      assert.equal(measured, secondary, `P11: the horizontal active label is ${measured}, not Secondary`);
    },
  });

  rows.push({
    name: "P2 P5 P8 the custom elements: empty leading title inset and slotted bare buttons",
    run: async () => {
      const [onSurface, onSurfaceVariant] = [await probe("on-surface"), await probe("on-surface-variant")];
      const measured = await page.evaluate(async () => {
        const settle = () => new Promise((resolve) => setTimeout(resolve, 60));
        document.body.replaceChildren();
        document.documentElement.dir = "ltr";
        const bar = document.createElement("m-top-app-bar");
        bar.setAttribute("headline", "Mail");
        document.body.append(bar);
        await settle();
        const shadow = bar.shadowRoot as unknown as ParentNode & { querySelector: (selector: string) => HTMLElement | null };
        const element = shadow.querySelector(".mtrl-top-app-bar")!;
        const headline = shadow.querySelector(".mtrl-top-app-bar__headline")!;
        const box = element.getBoundingClientRect();
        const emptyInset = Math.round(headline.getBoundingClientRect().left - box.left);
        // The same element with a bare button in each slot.
        const button = document.createElement("button");
        button.textContent = "Nav";
        button.slot = "leading";
        const action = document.createElement("button");
        action.textContent = "Act";
        action.slot = "trailing";
        bar.append(button, action);
        await settle();
        const withIconInset = Math.round(headline.getBoundingClientRect().left - box.left);
        const bottom = document.createElement("m-bottom-app-bar");
        document.body.append(bottom);
        const bare = document.createElement("button");
        bare.textContent = "Do";
        bottom.append(bare);
        await settle();
        return {
          emptyInset,
          withIconInset,
          leading: getComputedStyle(button).color,
          trailing: getComputedStyle(action).color,
          bottom: getComputedStyle(bare).color,
        };
      });
      assert.equal(measured.emptyInset, 16, `P5 element: a title with no leading content is inset ${measured.emptyInset}px, not 16`);
      assert.ok(measured.withIconInset > measured.emptyInset, `P5 element: a slotted leading icon does not take its gap (${measured.withIconInset}px)`);
      assert.equal(measured.leading, onSurface, `P2 element: a slotted bare leading button is ${measured.leading}, not OnSurface`);
      assert.equal(measured.trailing, onSurfaceVariant, `P2 element: a slotted bare trailing button is ${measured.trailing}, not OnSurfaceVariant`);
      assert.equal(measured.bottom, onSurfaceVariant, `P8 element: a slotted bare action is ${measured.bottom}, not OnSurfaceVariant`);
    },
  });

  // Every row is tried, so one run names all of them that are wrong.
  const failures: string[] = [];
  for (const row of rows) {
    try {
      await row.run();
      console.log(`  ok ${row.name}`);
    } catch (error) {
      failures.push(`${row.name}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, [], `app-bar conformance failures:\n  ${failures.join("\n  ")}`);
  console.log(`Passed app-bar conformance: ${rows.length} rows measured in Chromium.`);
} finally {
  await browser.close();
}

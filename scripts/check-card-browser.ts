#!/usr/bin/env bun
/**
 * Check the packed Card builders and the documented loading and expandable
 * card compositions (createCard + createProgress and createCard +
 * createIconButton) from the public entry points in Chromium.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import type * as Card from "../src/components/card";
import type createProgress from "../src/components/progress";
import type createIconButton from "../src/components/icon-button";

type CardCompositions = {
  createCard: typeof Card.createCard;
  createCardHeader: typeof Card.createCardHeader;
  createCardContent: typeof Card.createCardContent;
  createCardActions: typeof Card.createCardActions;
  createCardMedia: typeof Card.createCardMedia;
  createProgress: typeof createProgress;
  createIconButton: typeof createIconButton;
};

type CardWindow = Window & {
  cardParts: typeof Card;
  cardCompositions: CardCompositions;
  cards: ReturnType<typeof Card.default>[];
  finishLoadingCard: (text: string) => void;
};

let cachedBundle: string | undefined;
async function buildPublicEntryBundle(): Promise<string> {
  if (cachedBundle) return cachedBundle;
  const dir = await mkdtemp(join(tmpdir(), "mtrl-card-compositions-"));
  try {
    const built = existsSync(resolve("dist/index.js"));
    const root = built ? resolve("dist") : resolve("src");
    const ext = built ? "js" : "ts";
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        paths: {
          "material": [join(root, `index.${ext}`)],
          "material/components/*": [join(root, `components/*/index.${ext}`)],
        },
      },
    }));
    const entry = join(dir, "entry.ts");
    await writeFile(entry, `
      import { createCard, createCardHeader, createCardContent, createCardActions, createCardMedia, createProgress, createIconButton } from "material";
      import * as cardParts from "material/components/card";
      window.cardCompositions = { createCard, createCardHeader, createCardContent, createCardActions, createCardMedia, createProgress, createIconButton };
      if (!window.cardParts) window.cardParts = cardParts;
    `);
    const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "iife", minify: true });
    assert(result.success, String(result.logs));
    cachedBundle = await result.outputs[0].text();
    return cachedBundle;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function checkCard(page: Page, artifacts: string): Promise<void> {
  await page.addScriptTag({ content: await buildPublicEntryBundle() });
  await page.setViewportSize({ width: 800, height: 1400 });
  await page.route("https://mtrl.test/card.svg", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#9bb9d0"/></svg>',
  }));
  await page.evaluate(() => {
    const state = window as unknown as CardWindow;
    const { default: createCard, createCardHeader, createCardContent, createCardMedia, createCardActions } = state.cardParts;
    document.body.replaceChildren();
    document.body.style.cssText = "display:block;padding:24px;margin:0";
    document.documentElement.setAttribute("data-theme", "baseline");
    document.documentElement.setAttribute("data-theme-mode", "light");
    state.cards = [];
    for (const variant of ["elevated", "filled", "outlined"] as const) {
      const card = createCard({ variant });
      card.element.id = `card-${variant}`;
      card.element.style.cssText = "width:344px;margin-bottom:24px";
      card.addMedia(createCardMedia({ src: 'https://mtrl.test/card.svg', aspectRatio: "16:9", contain: true }));
      card.setHeader(createCardHeader({ title: "Old" }));
      card.setHeader(createCardHeader({ title: "Trip", subtitle: "Paris", avatar: "<img alt='' src='https://mtrl.test/card.svg'>", action: "<button>More</button>" }));
      card.addContent(createCardContent({ text: "A weekend away" }));
      card.setActions(createCardActions());
      const action = document.createElement("button"); action.textContent = "Share";
      card.setActions(createCardActions({ actions: [action], align: "end" }));
      state.cards.push(card);
      document.body.append(card.element);
    }
  });
  await page.waitForFunction(() => [...document.querySelectorAll(".mtrl-card img")].every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0));
  const root = page.locator("#card-elevated");
  assert.equal(await root.locator(".mtrl-card__header").count(), 1);
  assert.equal(await root.locator(".mtrl-card__actions").count(), 1);
  const styles = await root.evaluate(element => {
    const style = (selector: string) => getComputedStyle(element.querySelector(selector)!);
    return {
      header: style(".mtrl-card__header").display,
      title: style(".mtrl-card__header-title").fontSize,
      subtitle: style(".mtrl-card__header-subtitle").fontSize,
      avatar: style(".mtrl-card__header-avatar img").width,
      padding: style(".mtrl-card__content").padding,
      actions: style(".mtrl-card__actions").display,
      alignment: style(".mtrl-card__actions").justifyContent,
      image: style(".mtrl-card__media-img").objectFit,
    };
  });
  assert.deepEqual(styles, { header: "flex", title: "22px", subtitle: "14px", avatar: "40px", padding: "16px", actions: "flex", alignment: "flex-end", image: "contain" });
  const media = await root.locator(".mtrl-card__media").boundingBox();
  assert(media && Math.abs(media.width / media.height - 16 / 9) < 0.01);
  // A header with content and actions after it keeps the interior bottom pad.
  assert.equal(await root.locator(".mtrl-card__header").evaluate(element => getComputedStyle(element).paddingBottom), "0px");
  await page.evaluate(() => {
    const state = window as unknown as CardWindow;
    const { default: createCard, createCardHeader, createCardMedia } = state.cardParts;
    const block = document.createElement("div");
    block.style.cssText = "width:100%;height:100%;background:#c4c7c5";
    const card = createCard({ variant: "outlined" });
    card.element.id = "card-header-only";
    card.element.style.width = "340px";
    card.addMedia(createCardMedia({ element: block, aspectRatio: "1:1" }));
    card.setHeader(createCardHeader({ title: "90th minute", subtitle: "4.31 MB" }));
    state.cards.push(card);
    document.body.append(card.element);
  });
  const only = page.locator("#card-header-only .mtrl-card__header");
  assert.equal(await only.evaluate(element => getComputedStyle(element).paddingTop), "16px");
  const headerOnly = await only.evaluate(element => {
    const card = element.parentElement!;
    const subtitle = card.querySelector(".mtrl-card__header-subtitle")!;
    return {
      paddingBottom: getComputedStyle(element).paddingBottom,
      lastChild: element === card.lastElementChild,
      gap: card.getBoundingClientRect().bottom - subtitle.getBoundingClientRect().bottom,
    };
  });
  assert.equal(headerOnly.lastChild, true);
  assert.equal(headerOnly.paddingBottom, "16px", `header-only padding-bottom ${headerOnly.paddingBottom}, gap ${headerOnly.gap}px`);
  assert.ok(headerOnly.gap >= 12, `header-only subtitle is ${headerOnly.gap}px from the card edge`);
  const light = await root.evaluate(element => getComputedStyle(element).backgroundColor);
  await page.screenshot({ path: join(artifacts, "card-light.png"), animations: "disabled" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "dark"));
  await page.waitForTimeout(250);
  assert.notEqual(await root.evaluate(element => getComputedStyle(element).backgroundColor), light);
  await page.screenshot({ path: join(artifacts, "card-dark.png"), animations: "disabled" });
  await page.evaluate(() => {
    const state = window as unknown as CardWindow;
    state.cards[0].setActions(state.cardParts.createCardActions({ fullBleed: true, vertical: true }));
    state.cards[0].addContent(state.cardParts.createCardContent({ text: "No padding", padding: false }));
  });
  assert.equal(await root.locator(".mtrl-card__actions").evaluate(element => getComputedStyle(element).padding), "0px");
  assert.equal(await root.locator(".mtrl-card__actions").evaluate(element => getComputedStyle(element).flexDirection), "column");
  assert.equal(await root.locator(".mtrl-card__content--no-padding").evaluate(element => getComputedStyle(element).padding), "0px");

  // Recipe (a): Loading card composed from public entry points (createCard + createProgress)
  // Recipe (b): Expandable card composed from public entry points (createCard + plain createIconButton, APG disclosure)
  await page.evaluate(() => {
    const state = window as unknown as CardWindow;
    const { createCard, createCardHeader, createCardContent, createProgress, createIconButton } = state.cardCompositions;

    // (a) Loading card with aria-busy while loading
    const progress = createProgress({
      variant: "linear",
      indeterminate: true,
      ariaLabel: "Loading article",
    });
    progress.element.id = "card-loading-progress";
    const loadingBody = createCardContent({ children: [progress.element] });
    const loadingCard = createCard({
      variant: "outlined",
      header: { title: "Daily briefing", subtitle: "Fetching latest updates" },
      aria: { busy: "true" },
    });
    loadingCard.element.id = "card-loading";
    loadingCard.element.style.cssText = "width:340px;margin-top:24px";
    loadingCard.addContent(loadingBody);
    state.finishLoadingCard = (text: string) => {
      progress.destroy();
      loadingBody.replaceWith(createCardContent({ text }));
      loadingCard.element.removeAttribute("aria-busy");
    };
    state.cards.push(loadingCard);
    document.body.append(loadingCard.element);

    // (b) Expandable card with plain createIconButton (no toggle / no aria-pressed), aria-expanded, aria-controls, and hidden region
    const expandMore = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
    const expandLess = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
    const details = createCardContent({
      text: "Full itinerary, check-in instructions, and local transit passes.",
    });
    details.id = "trip-card-details";
    details.hidden = true;

    const expandButton = createIconButton({
      icon: expandMore,
      ariaLabel: "Trip details",
    });
    expandButton.element.id = "trip-expand-toggle";
    expandButton.element.setAttribute("aria-expanded", "false");
    expandButton.element.setAttribute("aria-controls", details.id);
    expandButton.on("click", () => {
      const expanded = details.hidden;
      details.hidden = !expanded;
      expandButton.element.setAttribute("aria-expanded", String(expanded));
      expandButton.setIcon(expanded ? expandLess : expandMore);
    });

    const expandableCard = createCard({
      variant: "elevated",
      content: { text: "Weekend in Lyon — 2 nights" },
    });
    expandableCard.element.id = "card-expandable";
    expandableCard.element.style.cssText = "width:340px;margin-top:24px";
    expandableCard.setHeader(createCardHeader({
      title: "Trip summary",
      subtitle: "May 15–17",
      action: expandButton.element,
    }));
    expandableCard.addContent(details);
    state.cards.push(expandableCard);
    document.body.append(expandableCard.element);
  });

  // Verify Recipe (a) loading state and completion transition
  const loadingCard = page.locator("#card-loading");
  const loadingBar = page.locator("#card-loading-progress");
  assert.equal(await loadingCard.getAttribute("role"), "article");
  assert.equal(await loadingCard.getAttribute("aria-busy"), "true");
  assert.equal(await loadingBar.getAttribute("role"), "progressbar");
  assert.equal(await loadingBar.getAttribute("aria-label"), "Loading article");
  assert.equal(await loadingBar.getAttribute("aria-valuenow"), null);
  assert.equal(await loadingBar.isVisible(), true);
  await page.evaluate(() => (window as unknown as CardWindow).finishLoadingCard("Markets closed higher across Europe."));
  assert.equal(await loadingCard.getAttribute("aria-busy"), null);
  assert.equal(await loadingCard.locator('[role="progressbar"]').count(), 0);
  assert.equal(await loadingCard.locator(".mtrl-card__content").textContent(), "Markets closed higher across Europe.");
  assert.equal(await loadingCard.locator(".mtrl-card__content").isVisible(), true);

  // Verify Recipe (b) initial collapsed ARIA (aria-pressed must be absent, accessible name constant) and hidden state
  const toggleBtn = page.locator("#trip-expand-toggle");
  const detailsRegion = page.locator("#trip-card-details");
  const initialName = await toggleBtn.getAttribute("aria-label");
  assert.equal(initialName, "Trip details");
  assert.equal(await toggleBtn.getAttribute("aria-expanded"), "false");
  assert.equal(await toggleBtn.getAttribute("aria-pressed"), null);
  assert.equal(await toggleBtn.getAttribute("aria-controls"), "trip-card-details");
  assert.equal(await toggleBtn.locator("path").getAttribute("d"), "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z");
  assert.equal(await detailsRegion.isVisible(), false);
  assert.equal(await detailsRegion.evaluate(el => (el as HTMLElement).hidden && getComputedStyle(el).display === "none"), true);

  // Keyboard toggle with Enter: expands region, swaps glyph, updates aria-expanded (aria-pressed still absent, accessible name identical), and keeps focus on toggle
  await toggleBtn.focus();
  await page.keyboard.press("Enter");
  assert.equal(await toggleBtn.getAttribute("aria-expanded"), "true");
  assert.equal(await toggleBtn.getAttribute("aria-pressed"), null);
  assert.equal(await toggleBtn.getAttribute("aria-label"), initialName);
  assert.equal(await toggleBtn.locator("path").getAttribute("d"), "M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z");
  assert.equal(await detailsRegion.isVisible(), true);
  assert.equal(await detailsRegion.evaluate(el => !(el as HTMLElement).hidden && getComputedStyle(el).display === "block"), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "trip-expand-toggle");

  // Keyboard toggle with Space: collapses region, swaps glyph back, updates aria-expanded (aria-pressed still absent, accessible name identical), and keeps focus on toggle
  await page.keyboard.press("Space");
  assert.equal(await toggleBtn.getAttribute("aria-expanded"), "false");
  assert.equal(await toggleBtn.getAttribute("aria-pressed"), null);
  assert.equal(await toggleBtn.getAttribute("aria-label"), initialName);
  assert.equal(await toggleBtn.locator("path").getAttribute("d"), "M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z");
  assert.equal(await detailsRegion.isVisible(), false);
  assert.equal(await detailsRegion.evaluate(el => (el as HTMLElement).hidden && getComputedStyle(el).display === "none"), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "trip-expand-toggle");

  // Keyboard toggle with Space again: re-expands region (accessible name still identical) and keeps focus on toggle
  await page.keyboard.press("Space");
  assert.equal(await toggleBtn.getAttribute("aria-expanded"), "true");
  assert.equal(await toggleBtn.getAttribute("aria-pressed"), null);
  assert.equal(await toggleBtn.getAttribute("aria-label"), initialName);
  assert.equal(await toggleBtn.locator("path").getAttribute("d"), "M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z");
  assert.equal(await detailsRegion.isVisible(), true);
  assert.equal(await page.evaluate(() => document.activeElement?.id), "trip-expand-toggle");

  assert.deepEqual(await page.locator(".mtrl-card").evaluateAll(elements => elements.flatMap(root => [root, ...root.querySelectorAll("*")].flatMap(element => [...element.classList].filter(name => /^mtrl-card-[^-]/.test(name))))), []);
  await page.evaluate(() => (window as unknown as CardWindow).cards.forEach(card => card.destroy()));
  assert.equal(await page.locator(".mtrl-card").count(), 0);
  await page.unroute("https://mtrl.test/card.svg");
  console.log("Passed packed Card: BEM builders, replacement selectors, media geometry, themes, actions, and loading/expandable compositions.");
}

if (import.meta.main) {
  const artifacts = resolve("analysis/core");
  await mkdir(artifacts, { recursive: true });
  let css: string;
  if (existsSync(resolve("dist/styles.css"))) {
    css = await readFile(resolve("dist/styles.css"), "utf8");
  } else {
    const sass = await import("sass");
    css = sass.compile(resolve("src/styles/main.scss"), { loadPaths: [resolve("src/styles")], logger: sass.Logger.silent }).css;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addStyleTag({ content: css });
    await checkCard(page, artifacts);
  } finally {
    await browser.close();
  }
}

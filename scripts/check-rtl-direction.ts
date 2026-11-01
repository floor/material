#!/usr/bin/env bun
// scripts/check-rtl-direction.ts
//
// The direction switch (src/styles/abstract/_emit.scss and
// src/styles/abstract/_direction.scss), end to end in a browser. The same
// class markup renders under both forms the build ships: the arms form
// (dist/styles.css, physical sides plus direction arms, put through the
// Bun.build minify a consumer's bundler runs) and the logical form
// (src/styles/main.scss compiled without the arms prelude, the form the
// element sheets and the adopted sheets carry). Every converted component is
// measured in both, against the same left-to-right numbers, and the two must
// agree. Before the switch, the minifier lowered the logical properties into
// :lang() arms that match a language, never dir="rtl": on that tree this
// pass's arms route fails every rtl case.
//
// The direction reaches a fixture as the page's dir, a dir on the component
// root itself (the runtime resolves a factory root from the nearest [dir],
// itself included — src/core/dom/direction.ts), the runtime's mtrl-rtl class
// on the root or on an ancestor, a shadow host the sheet is injected into,
// and a nearer dir="ltr" boundary inside an RTL page. A marker class is
// placed with the CSS direction it resolved, never with the class alone.
// lang="ar" alone is not a direction: nothing may move. A block-edge shape
// (the menu's, the list's, the bottom sheet's top pair) mirrors to itself
// and must stay put in every form.
//
// One move is watched over time as well: the switch's handle rides its
// spring to the checked position, on the live side in either direction and
// under both forms — a transition that named only the side the arm unset
// would jump instead of animating.
//
//   bun run build && bun run scripts/check-rtl-direction.ts
import assert from "node:assert/strict";
import { chromium, type Browser, type Page } from "playwright";
import * as sass from "sass";

const WIDTH = 600;
const HEIGHT = 720;
const TOL = 0.5;

interface Edges { left: number; right: number; width: number; boxWidth: number }
interface Corners { tl: number; tr: number; br: number; bl: number }
type Row = Record<string, Edges | Corners>;

/** A fixture: class markup, the reads it takes, and its left-to-right row. */
interface Fixture {
  name: string;
  /** The component roots, which the case's own marker is placed on. */
  roots: string;
  /** Inline style on each root. */
  rootStyle?: string;
  html: string;
  reads: { key: string; sel: string; within?: string; kind: "edges" | "corners" }[];
  /** The left-to-right row; no number here may depend on text metrics. */
  ltr: Row;
  /** Mirrored under rtl: edges swap sides, corners their diagonal. */
  mirrored: boolean;
}

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';

// The default size (s): outer corners are half the height, inner ones 4px.
const HALVES =
  `<button type="button" class="mtrl-button mtrl-button--filled mtrl-button--s mtrl-split-button__leading">Save</button>` +
  `<button type="button" class="mtrl-button mtrl-button--filled mtrl-button--s mtrl-split-button__trailing">` +
  `<span class="mtrl-button__icon"><svg width="22" height="22" viewBox="0 0 22 22"></svg></span></button>`;

const RAIL_ITEM =
  `<div class="mtrl-navigation-rail__item">` +
  `<span class="mtrl-navigation-rail__indicator"></span>` +
  `<span class="mtrl-navigation-rail__icon"></span>` +
  `<span class="mtrl-navigation-rail__label" style="width:64px;height:16px"></span>` +
  `<span class="mtrl-navigation-rail__badge"></span>` +
  `</div>`;

const FIXTURES: Fixture[] = [
  {
    // The leading half's inner corners face the gap: 20 outer, 4 inner.
    name: "split-button",
    roots: ".mtrl-split-button",
    html: `<div class="mtrl-split-button mtrl-split-button--s">${HALVES}</div>`,
    reads: [{ key: "leading", sel: ".mtrl-split-button__leading", kind: "corners" }],
    ltr: { leading: { tl: 20, tr: 4, br: 4, bl: 20 } },
    mirrored: true,
  },
  {
    name: "datepicker-parts",
    roots: ".mtrl-datepicker",
    rootStyle: "position:relative;width:200px;height:80px",
    html: `<div class="mtrl-datepicker">
        <span class="mtrl-datepicker__trigger"></span>
        <span class="mtrl-datepicker__mode-toggle"></span>
      </div>`,
    reads: [
      { key: "trigger", sel: ".mtrl-datepicker__trigger", within: ".mtrl-datepicker", kind: "edges" },
      { key: "modeToggle", sel: ".mtrl-datepicker__mode-toggle", within: ".mtrl-datepicker", kind: "edges" },
    ],
    // The affordances carry the 48dp minimum themselves.
    ltr: {
      trigger: { left: 148, right: 4, width: 48, boxWidth: 200 },
      modeToggle: { left: 140, right: 12, width: 48, boxWidth: 200 },
    },
    mirrored: true,
  },
  {
    name: "datepicker-fullscreen",
    roots: ".mtrl-datepicker",
    rootStyle: "position:relative;width:600px;height:100px",
    html: `<div class="mtrl-datepicker mtrl-datepicker--fullscreen">
        <span class="mtrl-datepicker__close"></span>
        <span class="mtrl-datepicker__save"></span>
      </div>`,
    reads: [
      { key: "close", sel: ".mtrl-datepicker__close", within: ".mtrl-datepicker", kind: "edges" },
      { key: "save", sel: ".mtrl-datepicker__save", within: ".mtrl-datepicker", kind: "edges" },
    ],
    ltr: {
      close: { left: 4, right: 548, width: 48, boxWidth: 600 },
      save: { left: 540, right: 12, width: 48, boxWidth: 600 },
    },
    mirrored: true,
  },
  {
    // The docked calendar hangs off its anchor's start edge (top: 100%).
    name: "datepicker-docked",
    roots: ".mtrl-datepicker",
    html: `<div class="slot" style="position:relative;width:200px;height:8px">` +
      `<div class="mtrl-datepicker mtrl-datepicker--docked" style="width:120px;height:40px"></div></div>`,
    reads: [{ key: "docked", sel: ".mtrl-datepicker--docked", within: ".slot", kind: "edges" }],
    ltr: { docked: { left: 0, right: 80, width: 120, boxWidth: 200 } },
    mirrored: true,
  },
  {
    name: "navigation-rail",
    roots: ".mtrl-navigation-rail",
    rootStyle: "height:160px",
    html: `<aside class="mtrl-navigation-rail">${RAIL_ITEM}</aside>`,
    reads: [
      { key: "indicator", sel: ".mtrl-navigation-rail__indicator", within: ".mtrl-navigation-rail__item", kind: "edges" },
      { key: "icon", sel: ".mtrl-navigation-rail__icon", within: ".mtrl-navigation-rail__item", kind: "edges" },
      { key: "label", sel: ".mtrl-navigation-rail__label", within: ".mtrl-navigation-rail__item", kind: "edges" },
      { key: "badge", sel: ".mtrl-navigation-rail__badge", within: ".mtrl-navigation-rail__item", kind: "edges" },
    ],
    ltr: {
      indicator: { left: 20, right: 20, width: 56, boxWidth: 96 },
      icon: { left: 36, right: 36, width: 24, boxWidth: 96 },
      label: { left: 16, right: 16, width: 64, boxWidth: 96 },
      badge: { left: 48, right: 32, width: 16, boxWidth: 96 },
    },
    mirrored: true,
  },
  {
    // The expanded rules carry the variant class on the root, so their arms
    // need the self form — the fab-menu bottom-start trap again.
    name: "navigation-rail-expanded",
    roots: ".mtrl-navigation-rail",
    rootStyle: "height:160px",
    html: `<aside class="mtrl-navigation-rail mtrl-navigation-rail--expanded">
        <div class="mtrl-navigation-rail__item">
          <span class="mtrl-navigation-rail__label" style="width:100px;height:16px"></span>
          <span class="mtrl-navigation-rail__badge mtrl-navigation-rail__badge--dot"></span>
        </div>
      </aside>`,
    reads: [
      { key: "label", sel: ".mtrl-navigation-rail__label", within: ".mtrl-navigation-rail__item", kind: "edges" },
      { key: "badge", sel: ".mtrl-navigation-rail__badge", within: ".mtrl-navigation-rail__item", kind: "edges" },
    ],
    ltr: {
      label: { left: 68, right: 112, width: 100, boxWidth: 280 },
      badge: { left: 238, right: 36, width: 6, boxWidth: 280 },
    },
    mirrored: true,
  },
  {
    // The modal rail is fixed, docked at the start edge, corner-large at the
    // end — one arm flips dock and corners together.
    name: "navigation-rail-modal",
    roots: ".mtrl-navigation-rail",
    html: `<aside class="mtrl-navigation-rail mtrl-navigation-rail--modal" open></aside>`,
    reads: [
      { key: "corners", sel: ".mtrl-navigation-rail", kind: "corners" },
      { key: "dock", sel: ".mtrl-navigation-rail", kind: "edges" },
    ],
    ltr: {
      corners: { tl: 0, tr: 16, br: 16, bl: 0 },
      dock: { left: 0, right: WIDTH - 96, width: 96, boxWidth: WIDTH },
    },
    mirrored: true,
  },
  {
    name: "navigation-bar",
    roots: ".mtrl-navigation-bar",
    rootStyle: "width:200px",
    html: `<nav class="mtrl-navigation-bar mtrl-navigation-bar--vertical">
        <div class="mtrl-navigation-bar__items"><div class="mtrl-navigation-bar__item" style="height:64px">
          <div class="mtrl-navigation-bar__content">
            <div class="mtrl-navigation-bar__icon">${ICON}</div>
            <span class="mtrl-navigation-bar__badge mtrl-navigation-bar__badge--dot"></span>
          </div>
        </div></div>
      </nav>`,
    reads: [{ key: "badge", sel: ".mtrl-navigation-bar__badge", within: ".mtrl-navigation-bar__content", kind: "edges" }],
    // The dot sits 50% + 6px into the 24px content box the icon widths.
    ltr: { badge: { left: 18, right: 0, width: 6, boxWidth: 24 } },
    mirrored: true,
  },
  {
    // A bottom-start menu: the close FAB keeps the top start corner and the
    // list is anchored to the same edge, overhanging into the page.
    name: "fab-menu",
    roots: ".mtrl-fab-menu",
    html: `<div class="slot" style="position:relative;width:200px;height:200px">` +
      `<div class="mtrl-fab-menu mtrl-fab-menu--bottom-start mtrl-fab-menu--medium">` +
      `<button class="mtrl-fab mtrl-fab-menu__fab"></button>` +
      `<div class="mtrl-fab-menu__list" style="width:100px"></div>` +
      `</div></div>`,
    reads: [
      { key: "fab", sel: ".mtrl-fab-menu__fab", within: ".mtrl-fab-menu", kind: "edges" },
      { key: "list", sel: ".mtrl-fab-menu__list", within: ".mtrl-fab-menu", kind: "edges" },
    ],
    ltr: {
      fab: { left: 0, right: 24, width: 56, boxWidth: 80 },
      list: { left: 0, right: -20, width: 100, boxWidth: 80 },
    },
    mirrored: true,
  },
  {
    // The logical corners of the placed FAB flip; the physical ones stay.
    name: "fab",
    roots: ".mtrl-fab",
    html: `<button class="mtrl-fab mtrl-fab--bottom-start"></button>` +
      `<button class="mtrl-fab mtrl-fab--top-end"></button>`,
    reads: [
      { key: "bottomStart", sel: ".mtrl-fab--bottom-start", kind: "edges" },
      { key: "topEnd", sel: ".mtrl-fab--top-end", kind: "edges" },
    ],
    ltr: {
      bottomStart: { left: 16, right: WIDTH - 16 - 56, width: 56, boxWidth: WIDTH },
      topEnd: { left: WIDTH - 16 - 56, right: 16, width: 56, boxWidth: WIDTH },
    },
    mirrored: true,
  },
  {
    name: "snackbar",
    roots: ".mtrl-snackbar",
    html: `<div class="mtrl-snackbar mtrl-snackbar--start"></div>` +
      `<div class="mtrl-snackbar mtrl-snackbar--end"></div>`,
    reads: [
      { key: "start", sel: ".mtrl-snackbar--start", kind: "edges" },
      { key: "end", sel: ".mtrl-snackbar--end", kind: "edges" },
    ],
    // Fixed at the bottom, 16px from the edge the placement names; the
    // minimum width is 320.
    ltr: {
      start: { left: 16, right: WIDTH - 16 - 320, width: 320, boxWidth: WIDTH },
      end: { left: WIDTH - 16 - 320, right: 16, width: 320, boxWidth: WIDTH },
    },
    mirrored: true,
  },
  {
    name: "toolbar",
    roots: ".mtrl-toolbar",
    html: `<div class="slot" style="position:relative;width:300px;height:120px">` +
      `<div class="mtrl-toolbar mtrl-toolbar--start" style="width:40px;height:40px"></div>` +
      `<div class="mtrl-toolbar mtrl-toolbar--end" style="width:40px;height:40px"></div></div>`,
    reads: [
      { key: "start", sel: ".mtrl-toolbar--start", within: ".slot", kind: "edges" },
      { key: "end", sel: ".mtrl-toolbar--end", within: ".slot", kind: "edges" },
    ],
    ltr: {
      start: { left: 16, right: 244, width: 40, boxWidth: 300 },
      end: { left: 244, right: 16, width: 40, boxWidth: 300 },
    },
    mirrored: true,
  },
  {
    name: "chips",
    roots: ".mtrl-chip",
    html: `<span class="mtrl-chip mtrl-chip--input"><span class="mtrl-chip__action">Label</span>` +
      `<button class="mtrl-chip__remove">&times;</button></span>`,
    reads: [{ key: "remove", sel: ".mtrl-chip__remove", kind: "corners" }],
    // The chip is corner-small (8px); the remove button zeroes its start side.
    ltr: { remove: { tl: 0, tr: 8, br: 8, bl: 0 } },
    mirrored: true,
  },
  {
    name: "progress",
    roots: ".mtrl-progress",
    rootStyle: "width:200px;height:4px",
    html: `<div class="mtrl-progress mtrl-progress--linear">` +
      `<span class="mtrl-progress__label" style="width:30px;height:12px"></span></div>`,
    reads: [{ key: "label", sel: ".mtrl-progress__label", within: ".mtrl-progress", kind: "edges" }],
    ltr: { label: { left: 170, right: 0, width: 30, boxWidth: 200 } },
    mirrored: true,
  },
  {
    // A block edge: the first item's top pair mirrors to itself.
    name: "menu",
    roots: ".mtrl-menu",
    html: `<div class="mtrl-menu mtrl-menu--vertical" style="width:200px">` +
      `<div class="mtrl-menu__list">` +
      `<div class="mtrl-menu__item" style="height:40px"></div>` +
      `<div class="mtrl-menu__item" style="height:40px"></div>` +
      `</div></div>`,
    reads: [{ key: "first", sel: ".mtrl-menu__item", kind: "corners" }],
    // The column's ends round at 12; the base 4px stays on the pair inside.
    ltr: { first: { tl: 12, tr: 12, br: 4, bl: 4 } },
    mirrored: false,
  },
  {
    name: "list",
    roots: ".mtrl-list",
    html: `<div class="mtrl-list mtrl-list--segmented" style="width:200px">` +
      `<div class="mtrl-list__content">` +
      `<div class="mtrl-list__item" style="height:40px"></div>` +
      `<div class="mtrl-list__item" style="height:40px"></div>` +
      `</div></div>`,
    reads: [{ key: "first", sel: ".mtrl-list__item", kind: "corners" }],
    // Outer corners 16 where the group meets the page; the 4px rest shape
    // stays on the inner pair.
    ltr: { first: { tl: 16, tr: 16, br: 4, bl: 4 } },
    mirrored: false,
  },
  {
    name: "bottom-sheet",
    roots: ".mtrl-bottom-sheet",
    html: `<div class="mtrl-bottom-sheet">` +
      `<div class="mtrl-bottom-sheet__container" style="width:200px;height:60px"></div></div>`,
    reads: [{ key: "container", sel: ".mtrl-bottom-sheet__container", kind: "corners" }],
    // CornerExtraLarge on the top pair, square at the screen edge.
    ltr: { container: { tl: 28, tr: 28, br: 0, bl: 0 } },
    mirrored: false,
  },
  {
    name: "side-sheet",
    roots: ".mtrl-side-sheet",
    html: `<div class="mtrl-side-sheet mtrl-side-sheet--modal mtrl-side-sheet--end">` +
      `<div class="mtrl-side-sheet__container" style="width:100px;height:80px"></div></div>` +
      `<div class="mtrl-side-sheet mtrl-side-sheet--modal mtrl-side-sheet--start">` +
      `<div class="mtrl-side-sheet__container" style="width:100px;height:80px"></div></div>`,
    reads: [
      { key: "end", sel: ".mtrl-side-sheet--end .mtrl-side-sheet__container", kind: "corners" },
      { key: "start", sel: ".mtrl-side-sheet--start .mtrl-side-sheet__container", kind: "corners" },
    ],
    ltr: {
      end: { tl: 16, tr: 0, br: 0, bl: 16 },
      start: { tl: 0, tr: 16, br: 16, bl: 0 },
    },
    mirrored: true,
  },
  {
    name: "switch",
    roots: ".mtrl-switch",
    html: `<label class="mtrl-switch"><span class="mtrl-switch__container">` +
      `<input type="checkbox" class="mtrl-switch__input">` +
      `<span class="mtrl-switch__track"><span class="mtrl-switch__thumb"></span></span></span></label>` +
      `<label class="mtrl-switch mtrl-switch--checked"><span class="mtrl-switch__container">` +
      `<input type="checkbox" class="mtrl-switch__input" checked>` +
      `<span class="mtrl-switch__track"><span class="mtrl-switch__thumb"></span></span></span></label>`,
    reads: [
      { key: "thumb", sel: ".mtrl-switch:not(.mtrl-switch--checked) .mtrl-switch__thumb", within: ".mtrl-switch:not(.mtrl-switch--checked) .mtrl-switch__track", kind: "edges" },
      { key: "checked", sel: ".mtrl-switch--checked .mtrl-switch__thumb", within: ".mtrl-switch--checked .mtrl-switch__track", kind: "edges" },
    ],
    // The track's 2dp border sits inside its 52dp box, so the insets read 8
    // and 28; the checked handle is 24dp at 22 from the start.
    ltr: {
      thumb: { left: 8, right: 28, width: 16, boxWidth: 52 },
      checked: { left: 24, right: 4, width: 24, boxWidth: 52 },
    },
    mirrored: true,
  },
];

type Direction = "ltr" | "rtl";

/** A case's marker placement; `dir` is the direction its own markup sets. */
interface Case {
  name: string;
  dir?: Direction;
  lang?: string;
  /** A dir attribute value placed on each root. */
  rootAttr?: string;
  rootClass?: string;
  rootStyle?: string;
  /** `name=value` attributes placed on the wrap. */
  wrapAttr?: string;
  wrapStyle?: string;
}

const CASES: Case[] = [
  { name: "plain" },
  { name: "root dir=rtl", dir: "rtl", rootAttr: "rtl" },
  { name: "root mtrl-rtl", dir: "rtl", rootClass: "mtrl-rtl", rootStyle: "direction:rtl" },
  { name: "ancestor mtrl-rtl", dir: "rtl", wrapAttr: "class=mtrl-rtl", wrapStyle: "direction:rtl" },
  { name: "ancestor dir=rtl", dir: "rtl", wrapAttr: "dir=rtl" },
  { name: "root dir=ltr (in an RTL page)", dir: "ltr", rootAttr: "ltr", rootClass: "mtrl-ltr" },
  { name: "root mtrl-ltr, no dir (in an RTL page)", dir: "ltr", rootClass: "mtrl-ltr", rootStyle: "direction:ltr" },
  { name: "lang=ar alone", lang: "ar" },
];

const caseDirection = (item: Case, page: Direction): Direction => item.dir ?? page;

const near = (a: number, b: number): boolean => Math.abs(a - b) <= TOL;

/** The mirrored value of one read: an edge swaps sides, a corner its diagonal. */
function mirroredValue(row: Edges | Corners, side: string, want: Record<string, number>): number {
  if ("left" in row) return side === "left" ? want.right! : side === "right" ? want.left! : want[side]!;
  const across: Record<string, string> = { tl: "tr", tr: "tl", br: "bl", bl: "br" };
  return want[across[side]!]!;
}

function assertRow(where: string, fixture: Fixture, row: Row, direction: Direction): void {
  const flip = fixture.mirrored && direction === "rtl";
  for (const [key, want] of Object.entries(fixture.ltr)) {
    const got = row[key];
    assert(got, `${where}: ${fixture.name} ${key} was not measured`);
    // Every row is a flat set of numeric reads; the interface names the keys.
    const wantNums = want as unknown as Record<string, number>;
    const gotNums = got as unknown as Record<string, number>;
    for (const side of Object.keys(wantNums)) {
      const expected = flip
        ? mirroredValue(want as Edges | Corners, side, wantNums)
        : wantNums[side]!;
      assert(
        near(gotNums[side]!, expected),
        `${where}: ${fixture.name} ${key}.${side} is ${gotNums[side]}; expected ${expected}`,
      );
    }
  }
}

const measure = (page: Page, sheet: string, direction: Direction): Promise<Record<string, Record<string, Row>>> =>
  page.evaluate(async ({ fixtures, cases, sheet, direction }) => {
    const host = document.getElementById("host") as HTMLElement;
    const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const viewportEdges = (element: Element): { left: number; right: number; width: number; boxWidth: number } => {
      const box = element.getBoundingClientRect();
      return { left: +box.left.toFixed(1), right: +(innerWidth - box.right).toFixed(1), width: +box.width.toFixed(1), boxWidth: innerWidth };
    };
    const measured: Record<string, Record<string, Row>> = {};
    for (const item of cases) {
      document.documentElement.lang = item.lang ?? "";
      const rows: Record<string, Row> = {};
      for (const fixture of fixtures) {
        host.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.style.cssText = `position:relative${item.wrapStyle ? ";" + item.wrapStyle : ""}`;
        if (item.wrapAttr) for (const match of item.wrapAttr.matchAll(/([a-z-]+)=([^ ]+)/g)) wrap.setAttribute(match[1]!, match[2]!);
        wrap.innerHTML = fixture.html;
        host.append(wrap);
        for (const root of wrap.querySelectorAll(fixture.roots)) {
          const element = root as HTMLElement;
          if (fixture.rootStyle) element.style.cssText += `;${fixture.rootStyle}`;
          if (item.rootStyle) element.style.cssText += `;${item.rootStyle}`;
          if (item.rootClass) element.classList.add(item.rootClass);
          if (item.rootAttr) element.setAttribute("dir", item.rootAttr);
        }
        await frame();
        const row: Row = {};
        for (const read of fixture.reads) {
          const element = wrap.querySelector(read.sel) as HTMLElement | null;
          if (!element) { row[read.key] = { missing: read.sel } as unknown as Corners; continue; }
          if (read.kind === "corners") {
            const style = getComputedStyle(element);
            row[read.key] = {
              tl: parseFloat(style.borderTopLeftRadius),
              tr: parseFloat(style.borderTopRightRadius),
              br: parseFloat(style.borderBottomRightRadius),
              bl: parseFloat(style.borderBottomLeftRadius),
            };
          } else if (read.within) {
            const box = element.getBoundingClientRect();
            const within = wrap.querySelector(read.within)!.getBoundingClientRect();
            row[read.key] = {
              left: +(box.left - within.left).toFixed(1),
              right: +(within.right - box.right).toFixed(1),
              width: +box.width.toFixed(1),
              boxWidth: +within.width.toFixed(1),
            };
          } else {
            row[read.key] = viewportEdges(element);
          }
        }
        rows[fixture.name] = row;
        host.innerHTML = "";
      }
      document.documentElement.lang = "";
      measured[`${sheet}/${direction}: ${item.name}`] = rows;
    }
    return measured;
  }, { fixtures: FIXTURES, cases: CASES, sheet, direction });

/**
 * The auto bar against its container query: below 600px the vertical form's
 * pill is a centred 56dp box placed by physical sides (a direction arm here
 * would carry the [dir] prelude's extra class and outrank the container
 * query's rules); at 600 and above the horizontal form's pill fills the
 * content box. The badge rides the start side in both, mirrored.
 */
async function assertAutoBar(browser: Browser, base: string, sheet: string): Promise<void> {
  const auto = (width: number): string =>
    `<div style="width:${width}px"><nav class="mtrl-navigation-bar mtrl-navigation-bar--auto">
      <div class="mtrl-navigation-bar__items">
        <a class="mtrl-navigation-bar__item" href="#">
          <div class="mtrl-navigation-bar__content">
            <div class="mtrl-navigation-bar__indicator"></div>
            <div class="mtrl-navigation-bar__icon">${ICON}</div>
            <span class="mtrl-navigation-bar__label"></span>
            <span class="mtrl-navigation-bar__badge mtrl-navigation-bar__badge--dot"></span>
          </div>
        </a>
      </div>
    </nav></div>`;
  for (const direction of ["ltr", "rtl"] as Direction[]) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, reducedMotion: "reduce" });
    try {
      await page.goto(`${base}${sheet}&dir=${direction}`);
      const rows = await page.evaluate(async (markup: Record<string, string>) => {
        const host = document.getElementById("host")!;
        const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
        const out: Record<string, { pill: number; centre: number; badgeLeft: number; badgeRight: number; badgeBox: number }> = {};
        for (const width of ["560", "600"]) {
          for (const name of ["plain", "root-class", "root-dir"]) {
            host.innerHTML = "";
            const wrap = document.createElement("div");
            wrap.innerHTML = markup[width]!;
            host.append(wrap);
            await frame();
            const nav = wrap.querySelector(".mtrl-navigation-bar") as HTMLElement;
            if (name === "root-class") { nav.classList.add("mtrl-rtl"); nav.style.direction = "rtl"; }
            if (name === "root-dir") nav.setAttribute("dir", "rtl");
            await frame();
            const pill = nav.querySelector(".mtrl-navigation-bar__indicator")!.getBoundingClientRect();
            const content = nav.querySelector(".mtrl-navigation-bar__content")!.getBoundingClientRect();
            const badge = nav.querySelector(".mtrl-navigation-bar__badge")!.getBoundingClientRect();
            out[`${width}/${name}`] = {
              pill: pill.width,
              centre: pill.x + pill.width / 2 - (content.x + content.width / 2),
              badgeLeft: +(badge.x - content.x).toFixed(1),
              badgeRight: +(content.right - badge.right).toFixed(1),
              badgeBox: content.width,
            };
            host.innerHTML = "";
          }
        }
        return out;
      }, { 560: auto(560), 600: auto(600) });
      // The direction the case itself establishes: rtl for the marker forms,
      // the page's for the plain one.
      for (const [key, row] of Object.entries(rows)) {
        const [width, name] = key.split("/");
        const rtl = name !== "plain" || direction === "rtl";
        const where = `auto bar ${width}px (${sheet}, ${direction}, ${name})`;
        if (width === "560") {
          assert(near(row.pill, 56), `${where}: the pill is ${row.pill}px wide; expected 56`);
          assert(Math.abs(row.centre) <= TOL, `${where}: the pill sits ${row.centre}px off centre`);
          // The dot: 50% + 6px into the 24px content box, mirrored under rtl.
          const [left, right] = rtl ? [0, 18] : [18, 0];
          assert(near(row.badgeLeft, left) && near(row.badgeRight, right),
            `${where}: the dot is ${row.badgeLeft}/${row.badgeRight} from the content box's sides; expected ${left}/${right}`);
        } else {
          assert(near(row.pill, row.badgeBox), `${where}: the pill is ${row.pill}px on a ${row.badgeBox}px content box`);
          assert(Math.abs(row.centre) <= TOL, `${where}: the pill sits ${row.centre}px off centre`);
          // The horizontal form: the dot 34px from the start of a 60px box.
          const [left, right] = rtl ? [20, 34] : [34, 20];
          assert(near(row.badgeLeft, left) && near(row.badgeRight, right),
            `${where}: the dot is ${row.badgeLeft}/${row.badgeRight} from the content box's sides; expected ${left}/${right}`);
        }
      }
    } finally {
      await page.close();
    }
  }
}

/** A shadow host: the sheet inside the root, the marker on the host itself. */
async function assertShadowHost(browser: Browser, base: string, sheet: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, reducedMotion: "reduce" });
  try {
    await page.goto(`${base}${sheet}&dir=ltr`);
    const row = await page.evaluate(async (halves) => {
      const host = document.getElementById("host")!;
      const css = [...document.querySelectorAll("style, link[rel='stylesheet']")].map((node) => node.outerHTML).join("\n");
      const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      const mount = document.createElement("div");
      mount.className = "mtrl-rtl";
      mount.style.cssText = "direction:rtl";
      const shadow = mount.attachShadow({ mode: "open" });
      shadow.innerHTML = `${css}<div style="width:400px;position:relative">
        <div class="mtrl-split-button mtrl-split-button--s">${halves}</div>
        <div class="mtrl-snackbar mtrl-snackbar--start"></div>
      </div>`;
      host.append(mount);
      await frame();
      const leading = shadow.querySelector(".mtrl-split-button__leading")!;
      const snackbar = shadow.querySelector(".mtrl-snackbar")!.getBoundingClientRect();
      return {
        tl: parseFloat(getComputedStyle(leading).borderTopLeftRadius),
        tr: parseFloat(getComputedStyle(leading).borderTopRightRadius),
        left: +snackbar.left.toFixed(1),
        right: +(innerWidth - snackbar.right).toFixed(1),
      };
    }, HALVES);
    assert.deepEqual(
      row,
      { tl: 4, tr: 20, left: WIDTH - 16 - 320, right: 16 },
      `shadow host (${sheet}): the sheet inside a shadow root did not mirror under the host's mtrl-rtl`,
    );
  } finally {
    await page.close();
  }
}

/** The switch's handle rides its spring to the checked position. */
async function assertSwitchAnimates(browser: Browser, base: string, sheet: string): Promise<void> {
  for (const direction of ["ltr", "rtl"] as Direction[]) {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    try {
      await page.goto(`${base}${sheet}&dir=${direction}`);
      const samples = await page.evaluate(async () => {
        const host = document.getElementById("host")!;
        const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
        host.innerHTML = `<label class="mtrl-switch" id="sw"><input type="checkbox" class="mtrl-switch__input">` +
          `<span class="mtrl-switch__track"><span class="mtrl-switch__thumb" style="width:16px;height:16px"></span></span></label>`;
        await frame();
        const label = document.getElementById("sw")!;
        const thumb = label.querySelector(".mtrl-switch__thumb") as HTMLElement;
        const track = label.querySelector(".mtrl-switch__track") as HTMLElement;
        const x = (): number => +(thumb.getBoundingClientRect().x - track.getBoundingClientRect().x).toFixed(2);
        const seen = [x()];
        label.classList.add("mtrl-switch--checked");
        for (let i = 0; i < 12; i++) { await frame(); seen.push(x()); }
        return seen;
      });
      assert(
        new Set(samples).size >= 4,
        `switch spring (${sheet}, ${direction}): the handle moved through ${new Set(samples).size} positions; a spring animates through more`,
      );
      assert(
        Math.abs(samples[0]! - samples[samples.length - 1]!) > 10,
        `switch spring (${sheet}, ${direction}): the handle did not reach the checked position`,
      );
    } finally {
      await page.close();
    }
  }
}

export async function checkRtlDirection(browser: Browser): Promise<void> {
  const logical = sass.compileString(await Bun.file("src/styles/main.scss").text(), {
    loadPaths: ["src/styles"],
    style: "compressed",
    logger: sass.Logger.silent,
  }).css;
  // The arms form through the pipeline a consumer runs: Bun.build, minified,
  // as size:check bundles it. This is the route the defect lived on — the
  // minifier lowered the logical properties into :lang() arms that match a
  // language, never dir="rtl" — so the switch's physical sides and direction
  // arms must survive it untouched.
  const bundled = await Bun.build({
    entrypoints: ["dist/styles.css"],
    format: "esm",
    target: "browser",
    minify: true,
  });
  assert(bundled.success, String(bundled.logs));
  const arms = await bundled.outputs.find((output) => output.path.endsWith(".css"))!.text();

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/logical.css") return new Response(logical, { headers: { "Content-Type": "text/css" } });
      if (url.pathname === "/arms.css") return new Response(arms, { headers: { "Content-Type": "text/css" } });
      const sheet = url.searchParams.get("sheet") === "logical" ? "/logical.css" : "/arms.css";
      const direction = url.searchParams.get("dir") === "rtl" ? "rtl" : "ltr";
      return new Response(
        `<!doctype html><html dir="${direction}"><head><link rel="stylesheet" href="${sheet}">` +
          `<style>body{margin:0;width:${WIDTH}px;height:${HEIGHT}px}` +
          // Nothing here is clicked or hovered: opt the harness out of hit
          // testing entirely, so no fixture can sit under the pointer and
          // morph — the split button's halves restyle their corners on
          // :hover, and where a headless renderer leaves the pointer across
          // a navigation is not ours to control.
          `#host,#host *{pointer-events:none}</style></head>` +
          `<body><main id="host"></main></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    },
  });

  try {
    for (const sheet of ["arms", "logical"] as const) {
      for (const direction of ["ltr", "rtl"] as Direction[]) {
        const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, reducedMotion: "reduce" });
        try {
          await page.goto(`${server.url.href}?sheet=${sheet}&dir=${direction}`);
          const measured = await measure(page, sheet, direction);
          for (const [where, rows] of Object.entries(measured)) {
            const item = CASES.find((c) => `${sheet}/${direction}: ${c.name}` === where)!;
            const caseDir = caseDirection(item, direction);
            for (const fixture of FIXTURES) {
              assertRow(`${sheet} sheet, ${direction} page: ${item.name}`, fixture, rows[fixture.name]!, caseDir);
            }
          }
        } finally {
          await page.close();
        }
      }
      await assertAutoBar(browser, server.url.href, `?sheet=${sheet}`);
      await assertShadowHost(browser, server.url.href, `?sheet=${sheet}`);
      await assertSwitchAnimates(browser, server.url.href, `?sheet=${sheet}`);
    }
    console.log(
      "RTL direction: both forms of the switch agree — " +
        `${FIXTURES.length} fixtures × ${CASES.length} markers × both sheets: the split button's corners, the datepicker's ` +
        `trigger, mode toggle, full-screen buttons and docked calendar, the rail's parts, expanded labels and modal dock, ` +
        `the bar's badge, the FAB menu's own placement, the placed FAB, the snackbar's and toolbar's edges, the chip's ` +
        `action corners, the progress label, the sheets' corners and the switch's handle — mirrored for the page's dir, ` +
        `a dir or mtrl-rtl on the root, an ancestor's mtrl-rtl, and cut by a nearer dir=ltr; lang=ar alone moves ` +
        `nothing; the block-edge pairs (menu, list, bottom sheet) and the auto bar's pill stay put in every form; a ` +
        `shadow host's mtrl-rtl reaches the sheet inside it; the switch's handle springs to checked in both directions.`,
    );
  } finally {
    server.stop(true);
  }
}

if (import.meta.main) {
  const browser = await chromium.launch();
  try {
    await checkRtlDirection(browser);
  } finally {
    await browser.close();
  }
}

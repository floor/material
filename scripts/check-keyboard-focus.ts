#!/usr/bin/env bun
// scripts/check-keyboard-focus.ts
/**
 * Browser keyboard focus conformance check across all 20 component families.
 *
 * Tabs and keyboard-navigates through every component's interactive demo in
 * light, dark, and forced-colors (@media (forced-colors: active)), plus
 * pointer-click focus and reduced-motion (@media (prefers-reduced-motion: reduce)):
 *   1. Every focusable element must show a visible focus change (outline,
 *      border, box-shadow, or active indicator bar) with >= 3.0:1 contrast
 *      against its adjacent surface in light and dark modes, and a visible
 *      non-transparent system colour change in forced-colors.
 *   2. Focus rings must not be clipped by overflow containers or inline
 *      clip-path insets, nor occluded by adjacent later-painted siblings.
 *   3. Pointer activation must not show a keyboard focus ring or leak a :focus
 *      state-layer background on non-editable controls.
 *   4. Under prefers-reduced-motion: reduce, focus ring outline-color must not
 *      transition from currentColor over a non-zero duration.
 *
 * Carries an explicit KNOWN_GAPS ratchet (G2..G15). Any unlisted failure fails
 * the check, and any listed gap that starts passing without being removed from
 * KNOWN_GAPS also fails the check so every fix must delete its row.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, type Page } from "playwright";
import * as sass from "sass";

export type CheckMode =
  | "light"
  | "dark"
  | "forced-colors"
  | "clip"
  | "occlusion"
  | "pointer"
  | "reduced-motion";

export interface KnownFocusGap {
  /** Audit gap ID (G2..G15). */
  id: `G${number}`;
  /** Component family name. */
  component: string;
  /** Focusable part and selector description. */
  part: string;
  /** Target ID in the mounted demo. */
  target: string;
  /** Failing check modes covered by this gap row. */
  modes: readonly CheckMode[];
}

/**
 * Explicit ratchet of known keyboard-focus gaps on main (G2..G15).
 * When a gap is fixed, its row MUST be deleted from this table; the check fails
 * if any listed (target, mode) passes while still present in KNOWN_GAPS.
 */
export const KNOWN_GAPS: readonly KnownFocusGap[] = [
  {
    id: "G2",
    component: "NavigationDrawer",
    part: "button.mtrl-drawer__item (unselected)",
    target: "drawer-item",
    modes: ["light", "dark"],
  },
  {
    id: "G2",
    component: "NavigationDrawer",
    part: "button.mtrl-drawer__item--active",
    target: "drawer-item-active",
    modes: ["light", "dark", "forced-colors"],
  },
  {
    id: "G3",
    component: "Slider",
    part: "div.mtrl-slider__handle",
    target: "slider-handle",
    modes: ["light", "dark", "forced-colors"],
  },
  {
    id: "G4",
    component: "Search",
    part: "input.mtrl-search__input (collapsed bar)",
    target: "search-input",
    modes: ["light", "dark", "forced-colors"],
  },
  {
    id: "G5",
    component: "TextField",
    part: "input.mtrl-text-field__input (.mtrl-text-field--filled)",
    target: "text-field-filled",
    modes: ["forced-colors"],
  },
  {
    id: "G5",
    component: "Select",
    part: "input.mtrl-text-field__input (.mtrl-select .mtrl-text-field--filled)",
    target: "select-filled",
    modes: ["forced-colors"],
  },
  {
    id: "G6",
    component: "NavigationBar",
    part: "button.mtrl-navigation-bar__item--active",
    target: "navigation-bar-item-active",
    modes: ["forced-colors"],
  },
  {
    id: "G6",
    component: "NavigationRail",
    part: "button.mtrl-navigation-rail__item--active",
    target: "navigation-rail-item-active",
    modes: ["forced-colors"],
  },
  {
    id: "G7",
    component: "Carousel",
    part: "a.mtrl-carousel__button",
    target: "carousel-cta-button",
    modes: ["dark"],
  },
  {
    id: "G8",
    component: "Toolbar",
    part: ".mtrl-toolbar--vibrant button.mtrl-icon-button",
    target: "toolbar-vibrant-icon-button",
    modes: ["dark"],
  },
  {
    id: "G9",
    component: "TimePicker",
    part: "button.mtrl-time-picker__hours (dial mode)",
    target: "timepicker-hours",
    modes: ["clip"],
  },
  {
    id: "G9",
    component: "TimePicker",
    part: "button.mtrl-time-picker__minutes (dial mode)",
    target: "timepicker-minutes",
    modes: ["clip"],
  },
  {
    id: "G10",
    component: "FABMenu",
    part: "button.mtrl-fab-menu__item (list presentation)",
    target: "fab-menu-item",
    modes: ["clip"],
  },
  {
    id: "G11",
    component: "Chips",
    part: ".mtrl-chips--scrollable .mtrl-chip[role='gridcell']",
    target: "chips-scrollable",
    modes: ["clip"],
  },
  {
    id: "G12",
    component: "SplitButton",
    part: "button.mtrl-split-button__leading",
    target: "split-button-leading",
    modes: ["occlusion"],
  },
  {
    id: "G12",
    component: "ButtonGroup",
    part: ".mtrl-button-group--connected button.mtrl-button-group__button",
    target: "button-group-connected",
    modes: ["occlusion"],
  },
  {
    id: "G12",
    component: "NavigationBar",
    part: ".mtrl-navigation-bar--horizontal button.mtrl-navigation-bar__item",
    target: "navigation-bar-horizontal-item",
    modes: ["occlusion"],
  },
  {
    id: "G12",
    component: "Snackbar",
    part: "button.mtrl-snackbar__action",
    target: "snackbar-action",
    modes: ["occlusion"],
  },
  {
    id: "G13",
    component: "Carousel",
    part: ".mtrl-carousel__item (compacted slide with clip-path inset)",
    target: "carousel-slide-compacted",
    modes: ["clip"],
  },
  {
    id: "G14",
    component: "Dialog",
    part: "button.mtrl-dialog__header-close",
    target: "dialog-close",
    modes: ["pointer"],
  },
  {
    id: "G15",
    component: "Button",
    part: "button.mtrl-button (@media prefers-reduced-motion: reduce)",
    target: "button-filled",
    modes: ["reduced-motion"],
  },
];

interface TargetSpec {
  target: string;
  component: string;
  part: string;
  /** Standard editable text/combobox input where pointer focus shows the field border/underline. */
  allowsPointerIndicator?: boolean;
  /** Check reduced-motion instant outline-color snap on this target. */
  checkReducedMotion?: boolean;
}

const TARGET_SPECS: readonly TargetSpec[] = [
  { target: "button-filled", component: "Button", part: "button.mtrl-button--filled", checkReducedMotion: true },
  { target: "button-outlined", component: "Button", part: "button.mtrl-button--outlined" },
  { target: "icon-button", component: "IconButton", part: "button.mtrl-icon-button" },
  { target: "fab", component: "FAB", part: "button.mtrl-fab" },
  { target: "extended-fab", component: "ExtendedFAB", part: "button.mtrl-extended-fab" },
  { target: "fab-menu-trigger", component: "FABMenu", part: "button.mtrl-fab-menu__fab" },
  { target: "fab-menu-item", component: "FABMenu", part: "button.mtrl-fab-menu__item" },
  { target: "button-group-standard", component: "ButtonGroup", part: ".mtrl-button-group--standard button.mtrl-button-group__button" },
  { target: "button-group-connected", component: "ButtonGroup", part: ".mtrl-button-group--connected button.mtrl-button-group__button" },
  { target: "split-button-leading", component: "SplitButton", part: "button.mtrl-split-button__leading" },
  { target: "split-button-trailing", component: "SplitButton", part: "button.mtrl-split-button__trailing" },
  { target: "chip-standalone", component: "Chip", part: "button.mtrl-chip__action" },
  { target: "chips-wrap", component: "Chips", part: ".mtrl-chips .mtrl-chip[role='gridcell']" },
  { target: "chips-scrollable", component: "Chips", part: ".mtrl-chips--scrollable .mtrl-chip[role='gridcell']" },
  { target: "checkbox", component: "Checkbox", part: "input.mtrl-checkbox__input" },
  { target: "radio", component: "Radio", part: "input.mtrl-radios__input" },
  { target: "switch", component: "Switch", part: "input.mtrl-switch__input" },
  { target: "slider-handle", component: "Slider", part: "div.mtrl-slider__handle" },
  { target: "text-field-filled", component: "TextField", part: "input.mtrl-text-field__input (.mtrl-text-field--filled)", allowsPointerIndicator: true },
  { target: "text-field-trailing-button", component: "TextField", part: "button.mtrl-text-field__trailing-icon--button" },
  { target: "text-field-outlined", component: "TextField", part: "input.mtrl-text-field__input (.mtrl-text-field--outlined)", allowsPointerIndicator: true },
  { target: "select-filled", component: "Select", part: "input.mtrl-text-field__input (.mtrl-select .mtrl-text-field--filled)", allowsPointerIndicator: true },
  { target: "select-outlined", component: "Select", part: "input.mtrl-text-field__input (.mtrl-select .mtrl-text-field--outlined)", allowsPointerIndicator: true },
  { target: "tabs-tab", component: "Tabs", part: "button.mtrl-tab" },
  { target: "navigation-rail-toggle", component: "NavigationRail", part: "button.mtrl-navigation-rail__toggle" },
  { target: "navigation-rail-item-active", component: "NavigationRail", part: "button.mtrl-navigation-rail__item--active" },
  { target: "navigation-rail-item", component: "NavigationRail", part: "button.mtrl-navigation-rail__item (unselected)" },
  { target: "navigation-bar-item-active", component: "NavigationBar", part: "button.mtrl-navigation-bar__item--active" },
  { target: "navigation-bar-item", component: "NavigationBar", part: "button.mtrl-navigation-bar__item (unselected)" },
  { target: "navigation-bar-horizontal-item", component: "NavigationBar", part: ".mtrl-navigation-bar--horizontal button.mtrl-navigation-bar__item" },
  { target: "drawer-item-active", component: "NavigationDrawer", part: "button.mtrl-drawer__item--active" },
  { target: "drawer-item", component: "NavigationDrawer", part: "button.mtrl-drawer__item (unselected)" },
  { target: "list-item", component: "List", part: "button.mtrl-list__action" },
  { target: "card-interactive", component: "Card", part: ".mtrl-card[tabindex='0']" },
  { target: "menu-trigger", component: "Menu", part: "button.mtrl-button (menu opener)" },
  { target: "bottom-sheet-handle", component: "BottomSheet", part: ".mtrl-bottom-sheet__handle" },
  { target: "side-sheet-close", component: "SideSheet", part: "button.mtrl-side-sheet__close" },
  { target: "snackbar-action", component: "Snackbar", part: "button.mtrl-snackbar__action" },
  { target: "snackbar-close", component: "Snackbar", part: "button.mtrl-snackbar__close" },
  { target: "datepicker-input", component: "DatePicker", part: "input.mtrl-datepicker__input (readonly)", allowsPointerIndicator: true },
  { target: "carousel-slide-primary", component: "Carousel", part: ".mtrl-carousel__item (primary)" },
  { target: "carousel-cta-button", component: "Carousel", part: "a.mtrl-carousel__button" },
  { target: "carousel-slide-compacted", component: "Carousel", part: ".mtrl-carousel__item (compacted)" },
  { target: "search-leading-icon", component: "Search", part: "button.mtrl-search__leading-icon" },
  { target: "search-input", component: "Search", part: "input.mtrl-search__input (collapsed bar)", allowsPointerIndicator: true },
  { target: "toolbar-standard-icon-button", component: "Toolbar", part: ".mtrl-toolbar--standard button.mtrl-icon-button" },
  { target: "toolbar-vibrant-icon-button", component: "Toolbar", part: ".mtrl-toolbar--vibrant button.mtrl-icon-button" },
  { target: "top-app-bar-icon-button", component: "TopAppBar", part: ".mtrl-top-app-bar button.mtrl-icon-button" },
  { target: "bottom-app-bar-icon-button", component: "BottomAppBar", part: ".mtrl-bottom-app-bar button.mtrl-icon-button" },
  { target: "dialog-close", component: "Dialog", part: "button.mtrl-dialog__header-close" },
  { target: "dialog-action", component: "Dialog", part: ".mtrl-dialog__footer button.mtrl-button" },
  { target: "timepicker-hours", component: "TimePicker", part: "button.mtrl-time-picker__hours" },
  { target: "timepicker-minutes", component: "TimePicker", part: "button.mtrl-time-picker__minutes" },
];

const ignoreKnownGaps = process.argv.includes("--ignore-known-gaps");
const sampleGapsArg = process.argv.find(arg => arg.startsWith("--without-gaps="));
const excludedGapIds = new Set(
  sampleGapsArg ? sampleGapsArg.slice("--without-gaps=".length).split(",").map(s => s.trim()) : []
);

const distStylesPath = resolve("dist/styles.css");
const cssText = existsSync(distStylesPath)
  ? await Bun.file(distStylesPath).text()
  : sass.compile(resolve("src/styles/main.scss"), {
      loadPaths: [resolve("src/styles")],
      style: "expanded",
      logger: sass.Logger.silent,
    }).css;

const bundle = await Bun.build({
  entrypoints: [resolve("src/index.ts")],
  target: "browser",
  minify: false,
});
assert(bundle.success, String(bundle.logs));
const jsText = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/index.js") {
      return new Response(jsText, { headers: { "Content-Type": "text/javascript" } });
    }
    if (pathname === "/styles.css") {
      return new Response(cssText, { headers: { "Content-Type": "text/css" } });
    }
    return new Response(
      `<!doctype html>
<html lang="en" data-theme="baseline" data-theme-mode="light">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="/styles.css">
  <style>
    body {
      margin: 0;
      padding: 24px;
      background-color: var(--mtrl-sys-color-surface);
      color: var(--mtrl-sys-color-on-surface);
      font-family: sans-serif;
    }
    .demo-stage {
      display: flex;
      flex-direction: column;
      gap: 20px;
      align-items: flex-start;
    }
    .demo-box {
      padding: 12px;
      position: relative;
    }
    .mtrl-fab-menu__scrim {
      pointer-events: none !important;
    }
  </style>
</head>
<body>
  <button id="focus-reset" type="button" style="width:2px;height:2px;padding:0;border:0;background:transparent">reset</button>
  <main id="demo-stage" class="demo-stage"></main>
  <script type="module">
    import * as mtrl from "/index.js";
    window.mtrl = mtrl;
    window.ready = true;
  </script>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

async function mountAllDemos(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const w = window as unknown as { mtrl: Record<string, (...args: unknown[]) => unknown> };
    const m = w.mtrl;
    const stage = document.getElementById("demo-stage")!;
    stage.replaceChildren();
    // Clean up any leftover body-level modals/overlays from previous mounts
    document.querySelectorAll(".mtrl-dialog-overlay, .mtrl-dialog, .mtrl-time-picker, .mtrl-snackbar-container").forEach(el => el.remove());

    const SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
    const addBox = (): HTMLElement => {
      const box = document.createElement("div");
      box.className = "demo-box";
      stage.append(box);
      return box;
    };
    const mark = (el: Element | null | undefined, id: string): void => {
      if (!el) throw new Error(`Missing focus target element for ${id}`);
      el.setAttribute("data-focus-target", id);
    };

    // 1. Button (filled & outlined)
    const btnFilled = m.createButton({ text: "Filled", variant: "filled" }) as { element: HTMLElement };
    addBox().append(btnFilled.element);
    mark(btnFilled.element, "button-filled");

    const btnOutlined = m.createButton({ text: "Outlined", variant: "outlined" }) as { element: HTMLElement };
    addBox().append(btnOutlined.element);
    mark(btnOutlined.element, "button-outlined");

    // 2. IconButton
    const iconBtn = m.createIconButton({ icon: SVG, ariaLabel: "Star" }) as { element: HTMLElement };
    addBox().append(iconBtn.element);
    mark(iconBtn.element, "icon-button");

    // 3. FAB, ExtendedFAB, FABMenu
    const fab = m.createFab({ icon: SVG, ariaLabel: "Create" }) as { element: HTMLElement };
    addBox().append(fab.element);
    mark(fab.element, "fab");

    const extFab = m.createExtendedFab({ icon: SVG, text: "Compose" }) as { element: HTMLElement };
    addBox().append(extFab.element);
    mark(extFab.element, "extended-fab");

    const fabMenu = m.createFabMenu({
      icon: SVG,
      ariaLabel: "Quick actions",
      presentation: "list",
      items: [
        { id: "reply", text: "Reply", icon: SVG },
        { id: "forward", text: "Forward", icon: SVG },
      ],
    }) as { element: HTMLElement; fab: HTMLElement; list: HTMLElement; open: () => void };
    addBox().append(fabMenu.element);
    fabMenu.element.style.position = "relative";
    fabMenu.open();
    (window as unknown as { __openFabMenu: () => void }).__openFabMenu = () => fabMenu.open();
    mark(fabMenu.fab, "fab-menu-trigger");
    mark(fabMenu.list.querySelector("button.mtrl-fab-menu__item"), "fab-menu-item");

    // 4. ButtonGroup (standard & connected)
    const bgStandard = m.createButtonGroup({
      kind: "standard",
      buttons: [
        { value: "day", text: "Day" },
        { value: "week", text: "Week" },
      ],
    }) as { element: HTMLElement };
    addBox().append(bgStandard.element);
    mark(bgStandard.element.querySelector("button.mtrl-button-group__button, button.mtrl-button"), "button-group-standard");

    const bgConnected = m.createButtonGroup({
      kind: "connected",
      buttons: [
        { value: "day", text: "Day" },
        { value: "week", text: "Week" },
      ],
    }) as { element: HTMLElement };
    addBox().append(bgConnected.element);
    mark(bgConnected.element.querySelector("button.mtrl-button-group__button, button.mtrl-button"), "button-group-connected");

    // 5. SplitButton
    const splitBtn = m.createSplitButton({
      text: "Send",
      items: [{ id: "later", text: "Schedule send" }],
    }) as { element: HTMLElement };
    addBox().append(splitBtn.element);
    mark(splitBtn.element.querySelector("button.mtrl-split-button__leading"), "split-button-leading");
    mark(splitBtn.element.querySelector("button.mtrl-split-button__trailing"), "split-button-trailing");

    // 6. Chip standalone & Chips (wrap + scrollable)
    const chipStandalone = m.createFilterChip({ label: "Filter chip" }) as { element: HTMLElement };
    addBox().append(chipStandalone.element);
    mark(chipStandalone.element.querySelector("button.mtrl-chip__action"), "chip-standalone");

    const chipsWrap = m.createChips({
      scrollable: false,
      chips: [
        { text: "Alpha", value: "a" },
        { text: "Beta", value: "b" },
      ],
    }) as { element: HTMLElement };
    addBox().append(chipsWrap.element);
    mark(chipsWrap.element.querySelector(".mtrl-chip[role='gridcell']"), "chips-wrap");

    const chipsScrollable = m.createChips({
      scrollable: true,
      chips: [
        { text: "First", value: "1" },
        { text: "Second", value: "2" },
      ],
    }) as { element: HTMLElement };
    addBox().append(chipsScrollable.element);
    mark(chipsScrollable.element.querySelector(".mtrl-chip[role='gridcell']"), "chips-scrollable");

    // 7. Checkbox, Radio, Switch
    const checkbox = m.createCheckbox({ label: "Accept terms" }) as { element: HTMLElement };
    addBox().append(checkbox.element);
    mark(checkbox.element.querySelector("input.mtrl-checkbox__input"), "checkbox");

    const radios = m.createRadios({
      name: "demo-radios",
      options: [
        { value: "one", label: "Option One" },
        { value: "two", label: "Option Two" },
      ],
    }) as { element: HTMLElement };
    addBox().append(radios.element);
    mark(radios.element.querySelector("input.mtrl-radios__input"), "radio");

    const sw = m.createSwitch({ label: "Enable alerts" }) as { element: HTMLElement };
    addBox().append(sw.element);
    mark(sw.element.querySelector("input.mtrl-switch__input"), "switch");

    // 8. Slider
    const slider = m.createSlider({ min: 0, max: 100, value: 40, ariaLabel: "Volume" }) as { element: HTMLElement };
    const sliderBox = addBox();
    sliderBox.style.width = "240px";
    sliderBox.append(slider.element);
    mark(slider.element.querySelector(".mtrl-slider__handle"), "slider-handle");

    // 9. TextField (filled + trailing button, outlined) & Select (filled, outlined)
    const tfFilled = m.createTextField({
      label: "Filled field",
      variant: "filled",
      trailingIcon: SVG,
      trailingIconLabel: "Clear",
    }) as { element: HTMLElement };
    addBox().append(tfFilled.element);
    mark(tfFilled.element.querySelector("input.mtrl-text-field__input"), "text-field-filled");
    mark(tfFilled.element.querySelector("button.mtrl-text-field__trailing-icon--button"), "text-field-trailing-button");

    const tfOutlined = m.createTextField({
      label: "Outlined field",
      variant: "outlined",
    }) as { element: HTMLElement };
    addBox().append(tfOutlined.element);
    mark(tfOutlined.element.querySelector("input.mtrl-text-field__input"), "text-field-outlined");

    const selFilled = m.createSelect({
      label: "Filled select",
      variant: "filled",
      options: [{ id: "1", text: "One" }],
    }) as { element: HTMLElement };
    addBox().append(selFilled.element);
    mark(selFilled.element.querySelector("input.mtrl-text-field__input"), "select-filled");

    const selOutlined = m.createSelect({
      label: "Outlined select",
      variant: "outlined",
      options: [{ id: "1", text: "One" }],
    }) as { element: HTMLElement };
    addBox().append(selOutlined.element);
    mark(selOutlined.element.querySelector("input.mtrl-text-field__input"), "select-outlined");

    // 10. Tabs
    const tabs = m.createTabs({
      tabs: [
        { value: "flights", text: "Flights" },
        { value: "hotels", text: "Hotels" },
      ],
    }) as { element: HTMLElement };
    addBox().append(tabs.element);
    mark(tabs.element.querySelector("button.mtrl-tab"), "tabs-tab");

    // 11a. NavigationRail
    const navRail = m.createNavigationRail({
      showMenu: true,
      items: [
        { id: "home", label: "Home", icon: SVG, active: true },
        { id: "files", label: "Files", icon: SVG },
      ],
    }) as { element: HTMLElement };
    addBox().append(navRail.element);
    mark(navRail.element.querySelector("button.mtrl-navigation-rail__toggle"), "navigation-rail-toggle");
    mark(navRail.element.querySelector("button.mtrl-navigation-rail__item--active"), "navigation-rail-item-active");
    mark(navRail.element.querySelector("button.mtrl-navigation-rail__item:not(.mtrl-navigation-rail__item--active)"), "navigation-rail-item");

    // 11b. NavigationBar (vertical default & horizontal item layout)
    const navBar = m.createNavigationBar({
      items: [
        { id: "inbox", label: "Inbox", icon: SVG, active: true },
        { id: "saved", label: "Saved", icon: SVG },
      ],
    }) as { element: HTMLElement };
    const navBarBox = addBox();
    navBarBox.style.width = "400px";
    navBarBox.append(navBar.element);
    mark(navBar.element.querySelector("button.mtrl-navigation-bar__item--active"), "navigation-bar-item-active");
    mark(navBar.element.querySelector("button.mtrl-navigation-bar__item:not(.mtrl-navigation-bar__item--active)"), "navigation-bar-item");

    const navBarHoriz = m.createNavigationBar({
      itemLayout: "horizontal",
      items: [
        { id: "one", label: "Destinations", icon: SVG, active: true },
        { id: "two", label: "Notifications", icon: SVG },
      ],
    }) as { element: HTMLElement };
    const navBarHorizBox = addBox();
    navBarHorizBox.style.width = "220px";
    navBarHorizBox.append(navBarHoriz.element);
    mark(navBarHoriz.element.querySelector("button.mtrl-navigation-bar__item"), "navigation-bar-horizontal-item");

    // 11c. NavigationDrawer
    const drawer = m.createDrawer({
      variant: "standard",
      open: true,
      headline: "Mail",
      items: [
        { id: "inbox", label: "Inbox", icon: SVG, active: true },
        { id: "sent", label: "Sent", icon: SVG },
      ],
    }) as { element: HTMLElement };
    addBox().append(drawer.element);
    mark(drawer.element.querySelector("button.mtrl-drawer__item--active"), "drawer-item-active");
    mark(drawer.element.querySelector("button.mtrl-drawer__item:not(.mtrl-drawer__item--active)"), "drawer-item");

    // 12a. List
    const list = m.createList({
      items: [
        { id: "row-1", headline: "First row" },
        { id: "row-2", headline: "Second row" },
      ],
    }) as { element: HTMLElement };
    const listBox = addBox();
    listBox.style.width = "320px";
    listBox.append(list.element);
    mark(list.element.querySelector("button.mtrl-list__action"), "list-item");

    // 12b. Card (interactive / clickable)
    const card = m.createCard({
      variant: "outlined",
      clickable: true,
    }) as { element: HTMLElement };
    card.element.textContent = "Interactive card";
    card.element.style.padding = "16px";
    addBox().append(card.element);
    mark(card.element, "card-interactive");

    // 13. Menu trigger
    const menuTrigger = m.createButton({ text: "Open menu", variant: "tonal" }) as { element: HTMLElement };
    addBox().append(menuTrigger.element);
    m.createMenu({
      opener: menuTrigger.element,
      items: [{ id: "copy", text: "Copy" }],
    });
    mark(menuTrigger.element, "menu-trigger");

    // 15a. BottomSheet (standard so it does not trap focus)
    const bottomSheet = m.createBottomSheet({
      variant: "standard",
      initialState: "expanded",
      dragHandle: true,
      title: "Standard bottom sheet",
      content: "Content",
      container: addBox(),
    }) as { element: HTMLElement };
    bottomSheet.element.style.position = "relative";
    const bsContainer = bottomSheet.element.querySelector<HTMLElement>(".mtrl-bottom-sheet__container");
    if (bsContainer) bsContainer.style.position = "relative";
    mark(bottomSheet.element.querySelector(".mtrl-bottom-sheet__handle"), "bottom-sheet-handle");

    // 15b. SideSheet (standard so it does not trap focus)
    const sideSheet = m.createSideSheet({
      variant: "standard",
      open: true,
      closeButton: true,
      title: "Standard side sheet",
      content: "Details",
      container: addBox(),
    }) as { element: HTMLElement };
    sideSheet.element.style.position = "relative";
    mark(sideSheet.element.querySelector("button.mtrl-side-sheet__close"), "side-sheet-close");

    // 16. Snackbar (with action & close button, placed in static flow so it never floats over other components on click)
    const snackbar = m.createSnackbar({
      message: "Message archived",
      action: "Undo",
      dismissible: true,
      duration: "indefinite",
    }) as { element: HTMLElement; show: () => void };
    snackbar.show();
    snackbar.element.style.position = "static";
    snackbar.element.style.transform = "none";
    addBox().append(snackbar.element);
    mark(snackbar.element.querySelector("button.mtrl-snackbar__action"), "snackbar-action");
    mark(snackbar.element.querySelector("button.mtrl-snackbar__close"), "snackbar-close");

    // 17a. DatePicker
    const datepicker = m.createDatePicker({
      label: "Start date",
      variant: "modal",
    }) as { element: HTMLElement };
    const datepickerBox = addBox();
    datepickerBox.style.width = "280px";
    datepickerBox.append(datepicker.element);
    mark(datepicker.element.querySelector("input.mtrl-datepicker__input"), "datepicker-input");

    // 18. Carousel (multi-browse with primary slide, CTA button, and compacted slide)
    const carouselBox = addBox();
    carouselBox.style.width = "520px";
    carouselBox.style.height = "220px";
    const carousel = m.createCarousel({
      variant: "multi-browse",
      itemWidth: 260,
      slides: [
        { title: "First slide", buttonText: "Explore", buttonUrl: "#explore" },
        { title: "Second slide" },
        { title: "Third slide" },
        { title: "Fourth slide" },
      ],
    }) as { element: HTMLElement };
    carousel.element.style.width = "500px";
    carousel.element.style.height = "200px";
    carouselBox.append(carousel.element);
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    const slides = Array.from(carousel.element.querySelectorAll<HTMLElement>(".mtrl-carousel__item"));
    mark(slides[0], "carousel-slide-primary");
    mark(carousel.element.querySelector("a.mtrl-carousel__button"), "carousel-cta-button");
    const compactedSlide = slides.slice(1).find(s => s.style.clipPath.includes("inset")) ?? slides[slides.length - 1];
    mark(compactedSlide, "carousel-slide-compacted");

    // 19. Search (collapsed bar)
    const search = m.createSearch({
      placeholder: "Search mail",
      expandOnFocus: false,
    }) as { element: HTMLElement };
    addBox().append(search.element);
    mark(search.element.querySelector("button.mtrl-search__leading-icon"), "search-leading-icon");
    mark(search.element.querySelector("input.mtrl-search__input"), "search-input");

    // 20. Toolbar (standard & vibrant), TopAppBar, BottomAppBar
    const toolbarStandard = m.createToolbar({
      color: "standard",
      ariaLabel: "Standard toolbar",
      items: [{ icon: SVG, ariaLabel: "Edit" }],
    }) as { element: HTMLElement };
    addBox().append(toolbarStandard.element);
    mark(toolbarStandard.element.querySelector("button.mtrl-icon-button"), "toolbar-standard-icon-button");

    const toolbarVibrant = m.createToolbar({
      color: "vibrant",
      ariaLabel: "Vibrant toolbar",
      items: [{ icon: SVG, ariaLabel: "Share" }],
    }) as { element: HTMLElement };
    addBox().append(toolbarVibrant.element);
    mark(toolbarVibrant.element.querySelector("button.mtrl-icon-button"), "toolbar-vibrant-icon-button");

    const topAppBar = m.createTopAppBar({
      title: "Inbox",
    }) as { element: HTMLElement; addTrailingElement: (el: HTMLElement) => void };
    const topBarBtn = m.createIconButton({ icon: SVG, ariaLabel: "Profile" }) as { element: HTMLElement };
    topAppBar.addTrailingElement(topBarBtn.element);
    addBox().append(topAppBar.element);
    mark(topBarBtn.element, "top-app-bar-icon-button");

    const bottomAppBar = m.createBottomAppBar({}) as { element: HTMLElement; addAction: (el: HTMLElement) => void };
    const bottomBarBtn = m.createIconButton({ icon: SVG, ariaLabel: "Archive" }) as { element: HTMLElement };
    bottomAppBar.addAction(bottomBarBtn.element);
    addBox().append(bottomAppBar.element);
    mark(bottomBarBtn.element, "bottom-app-bar-icon-button");

    // 14. Dialog (opened on demand via __ensureModal("dialog") so it does not make <main> inert while testing page components)
    const dialog = m.createDialog({
      title: "Confirm action",
      content: "Dialog body copy",
      closeButton: true,
      layer: "top",
      animationDuration: 0,
      buttons: [{ text: "Confirm", variant: "filled", closeOnClick: false }],
    }) as { open: () => void; close: () => void; isOpen: () => boolean };

    // 17b. TimePicker (opened on demand via __ensureModal("timepicker"))
    const timepicker = m.createTimePicker({
      type: "dial",
      value: "09:30",
    }) as { open: () => void; close: () => void; element: HTMLElement };

    let activeModal: "none" | "dialog" | "timepicker" = "none";
    (window as unknown as { __ensureModal: (which: "none" | "dialog" | "timepicker") => void }).__ensureModal = (which) => {
      if (activeModal === which) return;
      if (activeModal === "dialog") {
        dialog.close();
      } else if (activeModal === "timepicker") {
        timepicker.close();
      }
      activeModal = which;
      if (which === "dialog") {
        dialog.open();
        const dialogEl = document.querySelector<HTMLElement>(".mtrl-dialog");
        const closeBtn = dialogEl?.querySelector<HTMLButtonElement>("button.mtrl-dialog__header-close");
        mark(closeBtn, "dialog-close");
        mark(dialogEl?.querySelector(".mtrl-dialog__footer button.mtrl-button"), "dialog-action");
      } else if (which === "timepicker") {
        timepicker.open();
        const tpEl = document.querySelector<HTMLElement>(".mtrl-time-picker") ?? timepicker.element;
        mark(tpEl.querySelector("button.mtrl-time-picker__hours"), "timepicker-hours");
        mark(tpEl.querySelector("button.mtrl-time-picker__minutes"), "timepicker-minutes");
      }
    };
  });
}

interface TargetEvaluation {
  visible: boolean;
  contrast: number;
  reason: string;
  clipped: boolean;
  clipReason: string;
  occluded: boolean;
  occlusionReason: string;
}

/**
 * Tabs onto `target` via real keyboard navigation and measures its focus
 * indicator against its unfocused baseline in the current colour mode.
 */
async function evaluateKeyboardFocusOnTarget(
  page: Page,
  target: string,
  colorMode: "light" | "dark" | "forced-colors"
): Promise<TargetEvaluation> {
  // 1. Reset focus outside all components and capture unfocused indicator state
  await page.evaluate((targetId) => {
    const modal = targetId.startsWith("dialog-")
      ? "dialog"
      : targetId.startsWith("timepicker-")
        ? "timepicker"
        : "none";
    (window as unknown as { __ensureModal: (w: string) => void }).__ensureModal(modal);
    const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`);
    if (!el) throw new Error(`Missing [data-focus-target="${targetId}"]`);
    el.blur();
    if (modal === "none") {
      const reset = document.getElementById("focus-reset")!;
      reset.focus();
    }
    if (targetId === "fab-menu-item") {
      (window as unknown as { __openFabMenu: () => void }).__openFabMenu();
    }
    (el.closest(".demo-box") ?? el).scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
    if (targetId === "carousel-slide-compacted") {
      const scroller = el.closest(".mtrl-carousel")?.querySelector<HTMLElement>(".mtrl-carousel__scroller");
      if (scroller) {
        scroller.scrollLeft = 0;
        scroller.dispatchEvent(new Event("scroll"));
      }
    }
  }, target);

  const unfocusedSnap = await page.evaluate((targetId) => {
    return (window as unknown as { __captureIndicators: (id: string) => unknown }).__captureIndicators(targetId);
  }, target);

  // 2. Place a temporary tab-stop anchor immediately before the target (or ensure target is tabbable)
  // and press real Tab key so Chromium enters keyboard :focus-visible modality via Tab!
  await page.evaluate((targetId) => {
    const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`)!;
    document.getElementById("__tab-predecessor")?.remove();
    if (targetId === "fab-menu-item") {
      (window as unknown as { __openFabMenu: () => void }).__openFabMenu();
      const fabTrigger = document.querySelector<HTMLElement>('[data-focus-target="fab-menu-trigger"]')!;
      fabTrigger.focus();
      return;
    }
    const prevTabIndex = el.getAttribute("tabindex");
    if (el.tabIndex < 0) {
      el.dataset.restoreTabindex = prevTabIndex ?? "";
      el.tabIndex = 0;
    }
    const pred = document.createElement("button");
    pred.id = "__tab-predecessor";
    pred.type = "button";
    pred.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none";
    el.before(pred);
    pred.focus();
  }, target);

  await page.keyboard.press("Tab");

  // If a focus trap or sibling intercepted Tab, move directly via keyboard Tab/Arrow or focus while in keyboard modality
  const landed = await page.evaluate((targetId) => {
    const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`)!;
    document.getElementById("__tab-predecessor")?.remove();
    if (document.activeElement !== el) {
      (el as HTMLElement & { focus(options?: FocusOptions & { focusVisible?: boolean }): void }).focus({ focusVisible: true });
    }
    const active = document.activeElement === el;
    if ("restoreTabindex" in el.dataset) {
      const orig = el.dataset.restoreTabindex!;
      delete el.dataset.restoreTabindex;
      if (orig === "") el.removeAttribute("tabindex");
      else el.setAttribute("tabindex", orig);
    }
    return active;
  }, target);
  assert.equal(landed, true, `Failed to land keyboard focus on ${target}`);

  // Wait for any CSS transitions in normal motion mode to settle
  await page.evaluate((targetId) => {
    if (targetId === "carousel-slide-compacted") {
      const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`);
      const scroller = el?.closest(".mtrl-carousel")?.querySelector<HTMLElement>(".mtrl-carousel__scroller");
      if (scroller) {
        scroller.scrollLeft = 0;
        scroller.dispatchEvent(new Event("scroll"));
      }
    }
    return Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})));
  }, target);

  return await page.evaluate(
    ({ targetId, unfocused, mode }) => {
      return (
        window as unknown as {
          __evaluateFocusedTarget: (id: string, before: unknown, m: string) => TargetEvaluation;
        }
      ).__evaluateFocusedTarget(targetId, unfocused, mode);
    },
    { targetId: target, unfocused: unfocusedSnap, mode: colorMode }
  );
}

async function installBrowserHelpers(page: Page): Promise<void> {
  await page.evaluate(() => {
    type RGBA = [number, number, number, number];

    function parseColor(raw: string): RGBA {
      if (!raw || raw === "transparent" || raw === "none") return [0, 0, 0, 0];
      const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/.exec(raw);
      if (rgb) {
        return [
          Number(rgb[1]),
          Number(rgb[2]),
          Number(rgb[3]),
          rgb[4] === undefined ? 1 : Number(rgb[4]),
        ];
      }
      const srgb = /^color\(srgb\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(raw);
      if (srgb) {
        return [
          Number(srgb[1]) * 255,
          Number(srgb[2]) * 255,
          Number(srgb[3]) * 255,
          srgb[4] === undefined ? 1 : Number(srgb[4]),
        ];
      }
      return [0, 0, 0, 0];
    }

    function blend(fg: RGBA, bg: RGBA): RGBA {
      const a = fg[3] + bg[3] * (1 - fg[3]);
      if (a <= 0) return [0, 0, 0, 0];
      return [
        (fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / a,
        (fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / a,
        (fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / a,
        a,
      ];
    }

    function luminance([r, g, b]: RGBA): number {
      const chan = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
    }

    function contrastRatio(c1: RGBA, c2: RGBA): number {
      const l1 = luminance(c1);
      const l2 = luminance(c2);
      const hi = Math.max(l1, l2);
      const lo = Math.min(l1, l2);
      return (hi + 0.05) / (lo + 0.05);
    }

    function resolveSurfaceColor(el: Element, includeSelf: boolean): RGBA {
      const chain: Element[] = [];
      let cur: Element | null = includeSelf ? el : el.parentElement;
      while (cur) {
        chain.push(cur);
        cur = cur.parentElement;
      }
      chain.reverse();
      let surface: RGBA = [255, 255, 255, 1];
      for (const node of chain) {
        const bg = parseColor(getComputedStyle(node).backgroundColor);
        if (bg[3] > 0) {
          surface = blend(bg, surface);
        }
      }
      return surface;
    }

    interface CandidateSnap {
      key: string;
      outlineStyle: string;
      outlineWidth: number;
      outlineColor: string;
      outlineOffset: number;
      borderTopStyle: string;
      borderTopWidth: number;
      borderTopColor: string;
      borderBottomStyle: string;
      borderBottomWidth: number;
      borderBottomColor: string;
      boxShadow: string;
      backgroundColor: string;
      height: number;
      opacity: number;
      top: number;
    }

    function resolveCandidates(el: HTMLElement): Array<{ key: string; node: Element; pseudo?: string }> {
      const list: Array<{ key: string; node: Element; pseudo?: string }> = [
        { key: "self", node: el },
        { key: "self::before", node: el, pseudo: "::before" },
        { key: "self::after", node: el, pseudo: "::after" },
      ];
      const checkIcon = el.parentElement?.querySelector(".mtrl-checkbox__icon");
      if (checkIcon) {
        list.push({ key: "checkbox-icon::before", node: checkIcon, pseudo: "::before" });
      }
      const radioRipple = el.parentElement?.querySelector(".mtrl-radios__ripple");
      if (radioRipple) {
        list.push({ key: "radio-ripple", node: radioRipple });
      }
      const switchTrack = el.parentElement?.querySelector(".mtrl-switch__track");
      if (switchTrack) {
        list.push({ key: "switch-track", node: switchTrack });
      }
      const navIndicator = el.querySelector(
        ".mtrl-navigation-bar__indicator, .mtrl-navigation-rail__indicator, .mtrl-drawer__active-indicator"
      );
      if (navIndicator) {
        list.push({ key: "nav-indicator", node: navIndicator });
        list.push({ key: "nav-indicator::before", node: navIndicator, pseudo: "::before" });
      }
      const textField = el.closest(".mtrl-text-field");
      if (textField) {
        const field = textField.querySelector(".mtrl-text-field__field");
        if (field) {
          list.push({ key: "text-field-field::before", node: field, pseudo: "::before" });
        }
        const outlineStart = textField.querySelector(
          ".mtrl-text-field__outline-leading, .mtrl-text-field__outline-start"
        );
        if (outlineStart) {
          list.push({ key: "text-field-outline-start", node: outlineStart });
        }
      }
      const searchContainer = el.closest(".mtrl-search__container");
      if (searchContainer) {
        list.push({ key: "search-container", node: searchContainer });
      }
      const sliderHandle = el.classList.contains("mtrl-slider__handle") ? el : null;
      if (sliderHandle) {
        list.push({ key: "slider-handle::before", node: sliderHandle, pseudo: "::before" });
      }
      return list;
    }

    function snapCandidate(item: { key: string; node: Element; pseudo?: string }): CandidateSnap {
      const cs = getComputedStyle(item.node, item.pseudo);
      const pseudoAbsent =
        Boolean(item.pseudo) && (cs.content === "none" || cs.content === "normal");
      const outlineStyle = pseudoAbsent ? "none" : cs.outlineStyle;
      const outlineWidth = outlineStyle === "none" ? 0 : parseFloat(cs.outlineWidth) || 0;
      const borderTopStyle = pseudoAbsent ? "none" : cs.borderTopStyle;
      const borderTopWidth = borderTopStyle === "none" ? 0 : parseFloat(cs.borderTopWidth) || 0;
      const borderBottomStyle = pseudoAbsent ? "none" : cs.borderBottomStyle;
      const borderBottomWidth = borderBottomStyle === "none" ? 0 : parseFloat(cs.borderBottomWidth) || 0;
      return {
        key: item.key,
        outlineStyle,
        outlineWidth,
        outlineColor: cs.outlineColor,
        outlineOffset: parseFloat(cs.outlineOffset) || 0,
        borderTopStyle,
        borderTopWidth,
        borderTopColor: cs.borderTopColor,
        borderBottomStyle,
        borderBottomWidth,
        borderBottomColor: cs.borderBottomColor,
        boxShadow: pseudoAbsent ? "none" : cs.boxShadow,
        backgroundColor: pseudoAbsent ? "rgba(0, 0, 0, 0)" : cs.backgroundColor,
        height: pseudoAbsent ? 0 : parseFloat(cs.height) || 0,
        opacity: pseudoAbsent ? 0 : parseFloat(cs.opacity) ?? 1,
        top: parseFloat(cs.top) || 0,
      };
    }

    function captureIndicators(targetId: string): Record<string, CandidateSnap> {
      const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`)!;
      const snaps: Record<string, CandidateSnap> = {};
      for (const c of resolveCandidates(el)) {
        snaps[c.key] = snapCandidate(c);
      }
      return snaps;
    }

    function hasForcedColorsSystemOutlineRule(node: Element): boolean {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of Array.from(rules)) {
          if (
            rule instanceof CSSMediaRule &&
            rule.conditionText.includes("forced-colors")
          ) {
            for (const inner of Array.from(rule.cssRules)) {
              if (
                inner instanceof CSSStyleRule &&
                inner.selectorText.includes(":focus-visible") &&
                inner.style.outlineColor &&
                !inner.style.outlineColor.includes("var(")
              ) {
                try {
                  if (node.matches(inner.selectorText)) return true;
                } catch {
                  // ignore unsupported pseudo-elements in matches()
                }
              }
            }
          }
        }
      }
      return false;
    }

    function evaluateFocusedTarget(
      targetId: string,
      beforeMap: Record<string, CandidateSnap>,
      mode: "light" | "dark" | "forced-colors"
    ): TargetEvaluation {
      const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`)!;
      const candidates = resolveCandidates(el);

      let bestContrast = 1;
      let visible = false;
      let reason = "no outline, border, box-shadow, or active indicator change on focus";
      let activeRingNode: Element = el;
      let activeOutward = 0;
      let activeInsetOffset = 0;

      const afterMap: Record<string, CandidateSnap> = {};
      for (const item of candidates) {
        afterMap[item.key] = snapCandidate(item);
      }

      for (const item of candidates) {
        const before = beforeMap[item.key];
        const after = afterMap[item.key]!;
        if (!before) continue;

        // 1. Check CSS outline change (ignoring a duplicate outline painted at the exact same
        // width and offset as an already-outlined active indicator in forced-colors)
        const duplicatesExistingUnfocusedOutline = Object.values(beforeMap).some(
          prev =>
            prev.outlineWidth > 0 &&
            prev.outlineWidth === after.outlineWidth &&
            prev.outlineStyle === after.outlineStyle &&
            prev.outlineOffset === after.outlineOffset &&
            (mode === "forced-colors" || prev.outlineColor === after.outlineColor)
        );
        // In forced-colors, if nav-indicator already carried an inset active-pill outline
        // (outlineOffset < 0) on an active nav item, replacing that outline requires an
        // explicit @media (forced-colors: active) :focus-visible rule with a system colour
        // (e.g. CanvasText / Highlight) rather than relying on var(--mtrl-sys-color-*) (G6).
        const missingForcedColorsActivePillFocusRule =
          mode === "forced-colors" &&
          item.key === "nav-indicator" &&
          targetId.endsWith("-active") &&
          before.outlineWidth > 0 &&
          before.outlineOffset < 0 &&
          !hasForcedColorsSystemOutlineRule(item.node);

        const outlineChanged =
          after.outlineWidth >= 1 &&
          after.outlineStyle !== "none" &&
          !duplicatesExistingUnfocusedOutline &&
          !missingForcedColorsActivePillFocusRule &&
          (before.outlineWidth === 0 ||
            before.outlineStyle === "none" ||
            after.outlineWidth !== before.outlineWidth ||
            after.outlineOffset !== before.outlineOffset ||
            after.outlineColor !== before.outlineColor);

        if (outlineChanged) {
          // When outline-style is "auto" (UA default), Chromium paints #005FCC (-webkit-focus-ring-color) in light/dark
          const rawFg: RGBA =
            after.outlineStyle === "auto" && mode !== "forced-colors"
              ? [0, 95, 204, 1]
              : parseColor(after.outlineColor);
          const surface = resolveSurfaceColor(item.node, after.outlineOffset < 0);
          const fg = blend(rawFg, surface);
          const ratio = contrastRatio(fg, surface);
          activeRingNode = item.node;
          activeOutward = Math.max(0, after.outlineWidth + after.outlineOffset);
          activeInsetOffset = after.outlineOffset < 0 ? Math.abs(after.outlineOffset) : 0;

          if (mode === "forced-colors") {
            if (rawFg[3] > 0 && ratio >= 3.0) {
              visible = true;
              bestContrast = Math.max(bestContrast, ratio);
              reason = `outline ${after.outlineWidth}px ${after.outlineStyle} ${after.outlineColor} (${item.key})`;
            }
          } else if (ratio >= 3.0) {
            visible = true;
            bestContrast = Math.max(bestContrast, ratio);
            reason = `outline ${after.outlineWidth}px (${ratio.toFixed(2)}:1 on ${item.key})`;
          } else if (!visible) {
            bestContrast = Math.max(bestContrast, ratio);
            reason = `outline contrast ${ratio.toFixed(2)}:1 < 3.0:1 (${after.outlineColor} on ${item.key})`;
          }
        } else if (!visible && (duplicatesExistingUnfocusedOutline || missingForcedColorsActivePillFocusRule)) {
          reason = duplicatesExistingUnfocusedOutline
            ? `focus outline (${after.outlineWidth}px @ ${after.outlineOffset}px) duplicates existing active-indicator outline`
            : "active nav item lacks @media (forced-colors: active) :focus-visible system-colour outline rule";
        }

        // 2. Check border change >= 2px (e.g. Chips gridcell ::before or outlined TextField/Select or forced-colors filled underline)
        const topBorderChanged =
          after.borderTopWidth >= 2 &&
          (after.borderTopWidth !== before.borderTopWidth || after.borderTopColor !== before.borderTopColor);
        const bottomBorderChanged =
          after.borderBottomWidth >= 2 &&
          (after.borderBottomWidth !== before.borderBottomWidth || after.borderBottomColor !== before.borderBottomColor);

        if (topBorderChanged || bottomBorderChanged) {
          const bColor = topBorderChanged ? after.borderTopColor : after.borderBottomColor;
          const bWidth = topBorderChanged ? after.borderTopWidth : after.borderBottomWidth;
          const rawFg = parseColor(bColor);
          const surface = resolveSurfaceColor(item.node, false);
          const fg = blend(rawFg, surface);
          const ratio = contrastRatio(fg, surface);
          if (item.pseudo === "::before" && after.top < 0) {
            activeRingNode = item.node;
            activeOutward = Math.max(activeOutward, -after.top);
          }
          if (mode === "forced-colors") {
            if (rawFg[3] > 0 && ratio >= 3.0) {
              visible = true;
              bestContrast = Math.max(bestContrast, ratio);
              reason = `border ${bWidth}px ${bColor} (${item.key})`;
            }
          } else if (ratio >= 3.0) {
            visible = true;
            bestContrast = Math.max(bestContrast, ratio);
            reason = `border ${bWidth}px (${ratio.toFixed(2)}:1 on ${item.key})`;
          } else if (!visible) {
            bestContrast = Math.max(bestContrast, ratio);
            reason = `border contrast ${ratio.toFixed(2)}:1 < 3.0:1 (${bColor} on ${item.key})`;
          }
        }

        // 3. Check box-shadow change across all shadow layers (requiring a newly added or changed
        // layer with non-zero painted geometry >= 1px and >= 3:1 contrast against adjacent surface)
        if (after.boxShadow !== "none" && after.boxShadow !== before.boxShadow) {
          const splitLayers = (val: string): string[] =>
            !val || val === "none"
              ? []
              : val
                  .split(/,(?![^(]*\))/)
                  .map(s => s.trim())
                  .filter(Boolean);
          const beforeLayers = new Set(splitLayers(before.boxShadow));
          for (const layer of splitLayers(after.boxShadow)) {
            if (beforeLayers.has(layer)) continue;
            const shadowColorMatch = /rgba?\([^)]+\)/.exec(layer);
            if (!shadowColorMatch) continue;
            const rawFg = parseColor(shadowColorMatch[0]);
            if (rawFg[3] <= 0) continue;
            const isInset = /\binset\b/.test(layer);
            const lengths =
              layer
                .replace(/rgba?\([^)]+\)/g, "")
                .match(/-?[\d.]+px/g)
                ?.map(v => parseFloat(v)) ?? [];
            const offsetX = lengths[0] ?? 0;
            const offsetY = lengths[1] ?? 0;
            const blur = lengths[2] ?? 0;
            const spread = lengths[3] ?? 0;
            const paintedExtent =
              spread + blur + Math.max(Math.abs(offsetX), Math.abs(offsetY));
            if (paintedExtent < 1) continue;
            const surface = resolveSurfaceColor(item.node, isInset);
            const fg = blend(rawFg, surface);
            const ratio = contrastRatio(fg, surface);
            if (!isInset && spread > 0) {
              activeRingNode = item.node;
              activeOutward = Math.max(activeOutward, spread);
            } else if (isInset && spread > 0) {
              activeRingNode = item.node;
              activeInsetOffset = Math.max(activeInsetOffset, spread);
            }
            if (mode === "forced-colors") {
              if (ratio >= 3.0) {
                visible = true;
                bestContrast = Math.max(bestContrast, ratio);
                reason = `box-shadow ${shadowColorMatch[0]} (${item.key})`;
              }
            } else if (ratio >= 3.0) {
              visible = true;
              bestContrast = Math.max(bestContrast, ratio);
              reason = `box-shadow (${ratio.toFixed(2)}:1 on ${item.key})`;
            } else if (!visible) {
              bestContrast = Math.max(bestContrast, ratio);
              reason = `box-shadow contrast ${ratio.toFixed(2)}:1 < 3.0:1 (${shadowColorMatch[0]} on ${item.key})`;
            }
          }
        }

        // 4. Check filled TextField / Select active indicator bar (.mtrl-text-field__field::before)
        if (item.key === "text-field-field::before") {
          const barThickness = Math.max(after.height, after.borderTopWidth, after.borderBottomWidth);
          const barChanged =
            after.opacity > 0 &&
            barThickness >= 2 &&
            (after.opacity > before.opacity ||
              after.height > before.height ||
              after.backgroundColor !== before.backgroundColor ||
              after.borderTopWidth > before.borderTopWidth ||
              after.borderBottomWidth > before.borderBottomWidth);
          if (barChanged) {
            const bgColor = parseColor(after.backgroundColor);
            const borderColor: RGBA =
              after.borderTopWidth >= 2
                ? parseColor(after.borderTopColor)
                : after.borderBottomWidth >= 2
                  ? parseColor(after.borderBottomColor)
                  : [0, 0, 0, 0];
            const rawFg = borderColor[3] > 0 ? borderColor : bgColor;
            const surface = resolveSurfaceColor(el, true);
            const fg = blend(rawFg, surface);
            const ratio = contrastRatio(fg, surface);
            if (mode === "forced-colors") {
              if (rawFg[3] > 0 && ratio >= 3.0) {
                visible = true;
                bestContrast = Math.max(bestContrast, ratio);
                reason = `filled indicator bar ${barThickness}px`;
              } else if (!visible) {
                reason = `filled indicator ::before background-color (${after.backgroundColor}) has ${ratio.toFixed(2)}:1 contrast in forced-colors`;
              }
            } else if (ratio >= 3.0) {
              visible = true;
              bestContrast = Math.max(bestContrast, ratio);
              reason = `filled indicator bar ${barThickness}px (${ratio.toFixed(2)}:1)`;
            }
          }
        }
      }

      // Check overflow clipping & inline clip-path clipping
      let clipped = false;
      let clipReason = "";
      const rect = activeRingNode.getBoundingClientRect();
      if (activeOutward > 0 && rect.width > 0 && rect.height > 0) {
        const ringTop = rect.top - activeOutward;
        const ringBottom = rect.bottom + activeOutward;
        const ringLeft = rect.left - activeOutward;
        const ringRight = rect.right + activeOutward;
        let anc = activeRingNode.parentElement;
        while (anc && anc !== document.body && anc !== document.documentElement) {
          const acs = getComputedStyle(anc);
          const clipsY = ["hidden", "auto", "scroll", "clip"].includes(acs.overflowY);
          const clipsX = ["hidden", "auto", "scroll", "clip"].includes(acs.overflowX);
          if (clipsX || clipsY) {
            const ar = anc.getBoundingClientRect();
            const topClip = clipsY ? ar.top - ringTop : 0;
            const bottomClip = clipsY ? ringBottom - ar.bottom : 0;
            const leftClip = clipsX ? ar.left - ringLeft : 0;
            const rightClip = clipsX ? ringRight - ar.right : 0;
            const maxClip = Math.max(topClip, bottomClip, leftClip, rightClip);
            if (maxClip > 1.5) {
              clipped = true;
              clipReason = `outward focus ring (+${activeOutward}px) clipped by ${maxClip.toFixed(1)}px on ${anc.className || anc.tagName} (overflow: ${acs.overflowX}/${acs.overflowY})`;
              break;
            }
          }
          anc = anc.parentElement;
        }
      }
      if (!clipped && activeInsetOffset > 0) {
        const cp = (activeRingNode as HTMLElement).style?.clipPath || getComputedStyle(activeRingNode).clipPath;
        const insetMatch = /inset\(\s*([\d.]+)(?:px)?\s+([\d.]+)(?:px)?/.exec(cp);
        if (insetMatch) {
          const vInset = Number(insetMatch[1]);
          const hInset = Number(insetMatch[2]);
          if (vInset >= activeInsetOffset || hInset >= activeInsetOffset) {
            clipped = true;
            clipReason = `inset focus ring (-${activeInsetOffset}px) sliced by clip-path ${cp}`;
          }
        }
      }

      // Check adjacent later-painted sibling occlusion (only against interactive/painted siblings, not transparent layout wrappers)
      let occluded = false;
      let occlusionReason = "";
      if (activeOutward > 0 && (activeRingNode === el || el.contains(activeRingNode))) {
        const next = el.nextElementSibling as HTMLElement | null;
        if (next && (next.matches("button, a, [tabindex]") || parseColor(getComputedStyle(next).backgroundColor)[3] > 0)) {
          const nr = next.getBoundingClientRect();
          if (nr.width > 0 && nr.height > 0) {
            const ringTop = rect.top - activeOutward;
            const ringBottom = rect.bottom + activeOutward;
            const ringLeft = rect.left - activeOutward;
            const ringRight = rect.right + activeOutward;
            const overlapX = Math.min(ringRight, nr.right) - Math.max(ringLeft, nr.left);
            const overlapY = Math.min(ringBottom, nr.bottom) - Math.max(ringTop, nr.top);
            if (overlapX > 0.5 && overlapY > 0.5) {
              const elZ = parseInt(getComputedStyle(el).zIndex, 10) || 0;
              const nextZ = parseInt(getComputedStyle(next).zIndex, 10) || 0;
              if (elZ <= nextZ) {
                occluded = true;
                occlusionReason = `outward focus ring (+${activeOutward}px) overlapped by next sibling (${Math.min(overlapX, overlapY).toFixed(1)}px) with z-index ${elZ} <= ${nextZ}`;
              }
            }
          }
        }
      }

      return {
        visible,
        contrast: bestContrast,
        reason,
        clipped,
        clipReason,
        occluded,
        occlusionReason,
      };
    }

    Object.assign(window, {
      __captureIndicators: captureIndicators,
      __evaluateFocusedTarget: evaluateFocusedTarget,
    });
  });
}

/**
 * Checks pointer focus on a non-editable control: clicking with the mouse must
 * not leave a keyboard focus ring or a :focus background state layer when the
 * pointer moves away, compared to the post-blur rest state.
 */
async function evaluatePointerFocusOnTarget(
  page: Page,
  spec: TargetSpec
): Promise<{ ok: boolean; reason: string }> {
  if (spec.allowsPointerIndicator) {
    return { ok: true, reason: "editable input allows pointer indicator" };
  }

  await page.evaluate((targetId) => {
    const modal = targetId.startsWith("dialog-")
      ? "dialog"
      : targetId.startsWith("timepicker-")
        ? "timepicker"
        : "none";
    (window as unknown as { __ensureModal: (w: string) => void }).__ensureModal(modal);
    if (targetId === "fab-menu-item") {
      (window as unknown as { __openFabMenu: () => void }).__openFabMenu();
    }
    const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`)!;
    el.blur();
    el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
    const stopClose = (e: Event) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    window.addEventListener("click", stopClose, { capture: true, once: true });
  }, spec.target);

  const box = await page.locator(`[data-focus-target="${spec.target}"]`).boundingBox();
  assert(box, `Missing bounding box for ${spec.target}`);

  // Click target with pointer and move pointer to (0,0) so :hover is not active
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.move(0, 0);
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));

  return await page.evaluate((targetId) => {
    const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`)!;
    // Ensure el is focused in pointer modality if its click handler didn't move focus elsewhere
    const capture = (window as unknown as {
      __captureIndicators: (id: string) => Record<
        string,
        {
          outlineStyle: string;
          outlineWidth: number;
          outlineColor: string;
          backgroundColor: string;
        }
      >;
    }).__captureIndicators;

    const whileFocused = capture(targetId);
    const matchesFocus = el.matches(":focus");
    const matchesFocusVisible = el.matches(":focus-visible");

    el.blur();
    const afterBlur = capture(targetId);

    for (const [key, focusedSnap] of Object.entries(whileFocused)) {
      const restSnap = afterBlur[key];
      if (!restSnap) continue;
      if (focusedSnap.outlineWidth > 0 && restSnap.outlineWidth === 0) {
        return {
          ok: false,
          reason: `pointer click showed focus outline (${focusedSnap.outlineWidth}px ${focusedSnap.outlineStyle} on ${key}, :focus-visible=${matchesFocusVisible})`,
        };
      }
      if (
        key === "self" &&
        matchesFocus &&
        !matchesFocusVisible &&
        focusedSnap.backgroundColor !== restSnap.backgroundColor
      ) {
        return {
          ok: false,
          reason: `pointer :focus leaked background-color ${focusedSnap.backgroundColor} (rest: ${restSnap.backgroundColor}) without :focus-visible`,
        };
      }
    }
    return { ok: true, reason: "no pointer ring or :focus leak" };
  }, spec.target);
}

/**
 * Checks that under prefers-reduced-motion: reduce, a control with
 * transition-duration > 0 does not include outline-color in transition-property.
 */
async function evaluateReducedMotionOnTarget(
  page: Page,
  spec: TargetSpec
): Promise<{ ok: boolean; reason: string }> {
  await page.emulateMedia({ forcedColors: "none", colorScheme: "light", reducedMotion: "reduce" });
  const res = await page.evaluate((targetId) => {
    const el = document.querySelector<HTMLElement>(`[data-focus-target="${targetId}"]`)!;
    const cs = getComputedStyle(el);
    const durations = cs.transitionDuration
      .split(",")
      .map(s => parseFloat(s.trim()) || 0);
    const maxDuration = Math.max(0, ...durations);
    const props = cs.transitionProperty
      .split(",")
      .map(s => s.trim());
    if (maxDuration > 0 && (props.includes("outline-color") || props.includes("all"))) {
      return {
        ok: false,
        reason: `prefers-reduced-motion: reduce transitions outline-color over ${cs.transitionDuration} (transition-property: ${cs.transitionProperty})`,
      };
    }
    return { ok: true, reason: "outline-color snaps immediately under reduced-motion" };
  }, spec.target);
  await page.emulateMedia({ forcedColors: "none", colorScheme: "light", reducedMotion: "no-preference" });
  return res;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const pageErrors: string[] = [];
  page.on("pageerror", err => pageErrors.push(err.message));

  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  await installBrowserHelpers(page);
  await mountAllDemos(page);

  const failures = new Map<string, string>();
  const passReasons = new Map<string, string>();
  const recordFailure = (target: string, mode: CheckMode, detail: string) => {
    failures.set(`${target}:${mode}`, detail);
  };
  const recordPass = (target: string, mode: CheckMode, detail: string) => {
    passReasons.set(`${target}:${mode}`, detail);
  };

  // 1. Run keyboard focus checks across light, dark, and forced-colors
  const colorModes = ["light", "dark", "forced-colors"] as const;
  for (const mode of colorModes) {
    if (mode === "forced-colors") {
      await page.emulateMedia({ forcedColors: "active", colorScheme: "dark", reducedMotion: "no-preference" });
    } else {
      await page.emulateMedia({ forcedColors: "none", colorScheme: mode, reducedMotion: "no-preference" });
    }
    await page.evaluate((m) => {
      document.documentElement.dataset.theme = "baseline";
      document.documentElement.dataset.themeMode = m === "forced-colors" ? "dark" : m;
    }, mode);

    for (const spec of TARGET_SPECS) {
      const ev = await evaluateKeyboardFocusOnTarget(page, spec.target, mode);
      if (!ev.visible) {
        recordFailure(spec.target, mode, ev.reason);
      } else {
        recordPass(spec.target, mode, ev.reason);
      }
      if (mode === "light") {
        if (ev.clipped) {
          recordFailure(spec.target, "clip", ev.clipReason);
        } else {
          recordPass(spec.target, "clip", "not clipped");
        }
        if (ev.occluded) {
          recordFailure(spec.target, "occlusion", ev.occlusionReason);
        } else {
          recordPass(spec.target, "occlusion", "not occluded");
        }
      }
    }
  }

  // 2. Run pointer focus check in light mode
  await page.emulateMedia({ forcedColors: "none", colorScheme: "light", reducedMotion: "no-preference" });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "baseline";
    document.documentElement.dataset.themeMode = "light";
  });
  for (const spec of TARGET_SPECS) {
    const ptr = await evaluatePointerFocusOnTarget(page, spec);
    if (!ptr.ok) {
      recordFailure(spec.target, "pointer", ptr.reason);
    }
  }

  // 3. Run reduced-motion outline-color snap check
  for (const spec of TARGET_SPECS) {
    if (!spec.checkReducedMotion) continue;
    const rm = await evaluateReducedMotionOnTarget(page, spec);
    if (!rm.ok) {
      recordFailure(spec.target, "reduced-motion", rm.reason);
    }
  }

  // 3b. Verify box-shadow layer & geometry scoring on synthetic controls
  await page.emulateMedia({ forcedColors: "none", colorScheme: "light", reducedMotion: "no-preference" });
  const shadowFixtures: ReadonlyArray<{
    name: string;
    bg: string;
    rest: string;
    focus: string;
    expectedVisible: boolean;
  }> = [
    { name: "zero-area", bg: "rgb(255, 255, 255)", rest: "none", focus: "0 0 0 0 rgb(0, 0, 0)", expectedVisible: false },
    {
      name: "unchanged-outer-plus-invisible-layer",
      bg: "rgb(255, 255, 255)",
      rest: "0 0 0 3px rgb(0, 0, 0)",
      focus: "0 0 0 3px rgb(0, 0, 0), 0 0 0 0 rgb(0, 0, 0)",
      expectedVisible: false,
    },
    { name: "negative-spread-outer", bg: "rgb(255, 255, 255)", rest: "none", focus: "0 0 0 -2px rgb(0, 0, 0)", expectedVisible: false },
    { name: "visible-outer", bg: "rgb(255, 255, 255)", rest: "none", focus: "0 0 0 3px rgb(0, 0, 0)", expectedVisible: true },
    {
      name: "transparent-first-visible-second",
      bg: "rgb(255, 255, 255)",
      rest: "none",
      focus: "0 0 0 0 transparent, 0 0 0 3px rgb(0, 0, 0)",
      expectedVisible: true,
    },
    { name: "visible-inset", bg: "rgb(0, 0, 0)", rest: "none", focus: "inset 0 0 0 3px rgb(255, 255, 255)", expectedVisible: true },
  ];
  for (const fx of shadowFixtures) {
    const res = await page.evaluate((f) => {
      const w = window as unknown as {
        __captureIndicators: (id: string) => Record<string, unknown>;
        __evaluateFocusedTarget: (id: string, before: Record<string, unknown>, mode: "light") => { visible: boolean; reason: string };
      };
      const host = document.createElement("div");
      host.style.cssText = "background:rgb(255, 255, 255);padding:24px;";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-focus-target", `__shadow-probe-${f.name}`);
      btn.style.cssText = `appearance:none;border:0;outline:none;width:120px;height:40px;background:${f.bg};box-shadow:${f.rest};`;
      host.append(btn);
      document.body.append(host);
      btn.blur();
      const before = w.__captureIndicators(`__shadow-probe-${f.name}`);
      btn.style.boxShadow = f.focus;
      btn.focus();
      const after = w.__evaluateFocusedTarget(`__shadow-probe-${f.name}`, before, "light");
      host.remove();
      return after;
    }, fx);
    assert.equal(
      res.visible,
      fx.expectedVisible,
      `Box-shadow fixture "${fx.name}" (${fx.rest} -> ${fx.focus}) expected visible=${fx.expectedVisible}, got visible=${res.visible} (${res.reason})`
    );
  }

  assert.deepEqual(pageErrors, [], `Uncaught page errors during keyboard focus check: ${pageErrors.join("; ")}`);

  // 4. Ratchet comparison against KNOWN_GAPS
  const activeGaps = ignoreKnownGaps
    ? []
    : KNOWN_GAPS.filter(g => !excludedGapIds.has(g.id));

  const knownMap = new Map<string, KnownFocusGap>();
  for (const gap of activeGaps) {
    for (const mode of gap.modes) {
      knownMap.set(`${gap.target}:${mode}`, gap);
    }
  }

  const unexpectedFailures: string[] = [];
  const expectedFailures: string[] = [];
  for (const [key, detail] of failures.entries()) {
    const known = knownMap.get(key);
    if (known) {
      expectedFailures.push(`[KNOWN GAP ${known.id}] ${known.component} (${known.part}) [${key.split(":")[1]}]: ${detail}`);
    } else {
      const [targetId, mode] = key.split(":");
      const spec = TARGET_SPECS.find(s => s.target === targetId);
      unexpectedFailures.push(
        `[FAIL] ${spec?.component ?? targetId} (${spec?.part ?? targetId}) [${mode}]: ${detail}`
      );
    }
  }

  const unexpectedPasses: string[] = [];
  for (const gap of activeGaps) {
    for (const mode of gap.modes) {
      const key = `${gap.target}:${mode}`;
      if (!failures.has(key)) {
        unexpectedPasses.push(
          `[UNEXPECTED PASS ${gap.id}] ${gap.component} (${gap.part}) [${mode}] passed (${passReasons.get(key) ?? "ok"}) — remove this row/mode from KNOWN_GAPS`
        );
      }
    }
  }

  if (unexpectedFailures.length > 0 || unexpectedPasses.length > 0) {
    for (const line of unexpectedFailures) console.error(line);
    for (const line of unexpectedPasses) console.error(line);
    process.exitCode = 1;
  } else {
    console.log(
      `Passed keyboard focus check across ${TARGET_SPECS.length} focusable targets in light, dark, forced-colors, pointer, and reduced-motion (${expectedFailures.length} known gap checks matched KNOWN_GAPS).`
    );
  }
} finally {
  await browser.close();
  server.stop(true);
}

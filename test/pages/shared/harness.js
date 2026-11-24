// test/pages/shared/harness.js — the shared structure for every component
// page: an md3.io-style shell built from the library's own elements — a
// navigation rail, a components drawer, and a top app bar carrying the
// shared switches — with the page's scenarios in the content column.
// Pages import it as /shared/harness.js, served from this file.

/**
 * @typedef {Object} Scenario
 * @property {string} title The scenario's title.
 * @property {string} lookFor One line: what to look for.
 * @property {string} expected The expected result.
 * @property {() => string} [measure] An on-page measurement, polled live.
 * @property {HTMLElement} body Where the page mounts its instances.
 */

/**
 * @typedef {Object} PageOptions
 * @property {string} name The component's src/components folder name.
 * @property {{density?: boolean, forms?: {label: string, render: () => void}[]}} [toolbar]
 *   Toolbar switches the page opts into.
 */

/** @type {{slow: boolean, measures: {measure: () => string, el: HTMLElement}[]}} */
const state = { slow: false, measures: [] };

/** The component pages, grouped the way the rail groups them. */
const GROUPS = [
  { label: "Controls", icon: "tune", pages: ["slider", "split-button", "fab-menu"] },
  { label: "Surfaces", icon: "layers", pages: ["bottom-sheet", "drawer"] },
  { label: "Media", icon: "image", pages: ["carousel"] },
  { label: "Status", icon: "stacked_line_chart", pages: ["progress"] },
];

const ICONS = {
  tune: "<svg viewBox='0 0 24 24' width='24' height='24' fill='currentColor'><path d='M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z'/></svg>",
  layers: "<svg viewBox='0 0 24 24' width='24' height='24' fill='currentColor'><path d='M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z'/></svg>",
  image: "<svg viewBox='0 0 24 24' width='24' height='24' fill='currentColor'><path d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/></svg>",
  stacked_line_chart: "<svg viewBox='0 0 24 24' width='24' height='24' fill='currentColor'><path d='M3 21h18v-2H3v2zM5 17h3v-5H5v5zm5 0h3V7h-3v10zm5 0h3v-9h-3v9z'/></svg>",
  menu: "<svg viewBox='0 0 24 24' width='24' height='24' fill='currentColor'><path d='M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z'/></svg>",
};

const sweep = () => {
  const rate = state.slow ? 0.2 : 1;
  const apply = (root) => {
    for (const animation of root.getAnimations({ subtree: true })) animation.playbackRate = rate;
  };
  apply(document);
  document.querySelectorAll("*").forEach((el) => { if (el.shadowRoot) apply(el.shadowRoot); });
};

const armSlowMotion = (root) => {
  for (const event of ["transitionrun", "transitionstart"]) root.addEventListener(event, sweep, true);
};

/** @type {() => void} A re-render hook the factory/element switches call. */
let rerender = () => {};

const railLink = (page) => `/components/${page}/`;

const buildShell = (options, commit) => {
  const bar = document.createElement("m-app-bar");
  bar.setAttribute("headline", options.name);
  bar.setAttribute("no-scroll", "");
  bar.setAttribute("no-compress", "");
  bar.setAttribute("aria-label", "Test pages");

  const menuButton = document.createElement("button");
  menuButton.slot = "leading";
  menuButton.setAttribute("aria-label", "Open the components drawer");
  menuButton.innerHTML = ICONS.menu;
  menuButton.style.cssText = "background:none;border:none;cursor:pointer;padding:8px;display:inline-flex";
  bar.append(menuButton);

  const toolbar = document.createElement("div");
  toolbar.slot = "trailing";
  toolbar.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding-inline-end:16px";
  const button = (label, onClick) => {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.addEventListener("click", () => { onClick(); el.classList.toggle("tp-on"); });
    toolbar.append(el);
    return el;
  };
  button("Dark", () => {
    const dark = document.documentElement.dataset.themeMode !== "dark";
    document.documentElement.dataset.themeMode = dark ? "dark" : "light";
  });
  button("RTL", () => {
    document.documentElement.dir = document.documentElement.dir === "rtl" ? "ltr" : "rtl";
  });
  if (options.toolbar?.density) {
    const select = document.createElement("select");
    for (const density of [0, -1, -2, -3, -4, -5]) {
      const option = document.createElement("option");
      option.value = String(density);
      option.textContent = `density ${density}`;
      select.append(option);
    }
    select.addEventListener("change", () => {
      document.documentElement.style.setProperty("--mtrl-density", select.value);
      rerender();
    });
    toolbar.append(select);
  }
  const slowButton = button("Slow motion: off", () => {
    state.slow = !state.slow;
    slowButton.textContent = state.slow ? "Slow motion: on (5x)" : "Slow motion: off";
    sweep();
  });
  if (options.toolbar?.forms) {
    for (const form of options.toolbar.forms) {
      button(form.label, () => {
        for (const other of options.toolbar.forms) {
          if (other !== form) other.render();
        }
        form.render();
        rerender();
      });
    }
  }
  bar.append(toolbar);

  const shell = document.createElement("div");
  shell.className = "tp-shell tp-docked";
  const rail = document.createElement("m-navigation-rail");
  rail.setAttribute("no-toggle", "");
  const current = location.pathname.replace(/\/+$/, "").split("/").pop() || options.name;
  for (const group of GROUPS) {
    const item = document.createElement("m-navigation-rail-item");
    item.setAttribute("value", group.label);
    item.setAttribute("label", group.label);
    item.setAttribute("icon", group.icon);
    item.setAttribute("href", railLink(group.pages[0]));
    item.setAttribute("badge", String(group.pages.length));
    rail.append(item);
  }
  const drawer = document.createElement("m-drawer");
  drawer.setAttribute("open", "");
  drawer.id = "tp-drawer";
  const currentInGroup = (pages) => pages.includes(current);
  for (const group of GROUPS) {
    const item = document.createElement("m-drawer-item");
    item.setAttribute("value", group.label);
    item.setAttribute("label", group.label);
    if (currentInGroup(group.pages)) item.setAttribute("expanded", "");
    for (const page of group.pages) {
      const child = document.createElement("m-drawer-item");
      child.setAttribute("value", page);
      child.setAttribute("href", railLink(page));
      child.textContent = page;
      item.append(child);
    }
    drawer.append(item);
  }
  const content = document.createElement("main");
  content.id = "tp-main";
  shell.append(rail, drawer, content);
  document.body.append(bar, shell);
  drawer.setAttribute("value", current);

  const setDocking = () => {
    const docked = matchMedia("(min-width: 1600px)").matches;
    shell.classList.toggle("tp-docked", docked);
    if (docked) drawer.removeAttribute("modal");
    else drawer.setAttribute("modal", "");
  };
  setDocking();
  matchMedia("(min-width: 1600px)").addEventListener("change", setDocking);
  menuButton.addEventListener("click", () => drawer.toggleAttribute("open"));

  return { content, drawer };
};

export async function initPage(options) {
  await import("/dist/elements/css/drawer.js");
  await import("/dist/elements/css/navigation-rail.js");
  await import("/dist/elements/css/top-app-bar.js");
  const { defineDrawer, defineNavigationRail, defineAppBar } = await import("/dist/elements/index.js");
  defineDrawer();
  defineNavigationRail();
  defineAppBar();

  const commit = await fetch("/__commit").then((r) => r.text()).catch(() => "unknown");
  const { content } = buildShell(options, commit);
  const header = document.createElement("div");
  header.className = "tp-commit";
  header.textContent = `built from ${commit}`;
  content.append(header);
  armSlowMotion(document);
  document.querySelectorAll("*").forEach((el) => { if (el.shadowRoot) armSlowMotion(el.shadowRoot); });
  setInterval(() => {
    for (const row of state.measures) row.el.textContent = row.measure();
  }, 400);
  return content;
}

/** One section of the fixed order; returns the element scenarios mount into. */
export function section(parent, title) {
  const el = document.createElement("section");
  el.className = "tp-section";
  el.innerHTML = `<h2>${title}</h2>`;
  parent.append(el);
  return el;
}

/** One scenario: title, what to look for, expected result, optional live measure. */
export function scenario(parent, spec) {
  const el = document.createElement("article");
  el.className = "tp-scenario";
  el.innerHTML = `<h3>${spec.title}</h3><p class="tp-look"><b>Look for</b> ${spec.lookFor}</p><p class="tp-expected"><b>Expected</b> ${spec.expected}</p><div class="tp-body"></div><p class="tp-measure"></p>`;
  parent.append(el);
  const body = el.querySelector(".tp-body");
  spec.mount(body);
  if (spec.measure) {
    const measureEl = el.querySelector(".tp-measure");
    state.measures.push({ measure: spec.measure, el: measureEl });
    measureEl.textContent = spec.measure();
  }
}

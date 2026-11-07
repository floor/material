#!/usr/bin/env bun
/**
 * Browser accessibility check for Patch (c) (A9, A10, A17):
 * - A9: Menu & <m-menu> (no aria-selected="false" on unselected role="menuitem",
 *       preserved on listbox role="option" and selected items; named menu list
 *       and submenu AX nodes)
 * - A10: Search & <m-search> (fullscreen <dialog.mtrl-search__surface> carries
 *        its accessible name in Chromium AX tree at creation and after updates)
 * - A17: BottomSheet & SideSheet (single dialog AX node in top-layer modal,
 *        named modal/standard surfaces across factory and custom elements via
 *        title, headline, slot, or ariaLabel/aria-label)
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";

interface RawAXValue {
  value?: unknown;
}

interface RawAXProperty {
  name: string;
  value?: RawAXValue;
}

interface RawAXNode {
  nodeId: string;
  ignored?: boolean;
  role?: RawAXValue;
  name?: RawAXValue;
  properties?: RawAXProperty[];
  childIds?: string[];
}

interface AXSummary {
  role: string;
  name: string;
  props: Record<string, unknown>;
}

const repoRoot = resolve(import.meta.dir, "..");
const cssResult = sass.compile(resolve(repoRoot, "src/styles/main.scss"), {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  silenceDeprecations: ["mixed-decls"],
});

const entrySource = `
import * as mtrl from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineAll, registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/index.ts"))};
registerStyles(${JSON.stringify(cssResult.css)});
defineAll();
window.mtrl = mtrl;
`;

const bundleBuild = await Bun.build({
  entrypoints: ["data-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [
    {
      name: "virtual-entry",
      setup(build) {
        build.onResolve({ filter: /^data-entry\.ts$/ }, () => ({
          path: resolve(repoRoot, "data-entry.ts"),
        }));
        build.onLoad(
          { filter: /data-entry\.ts$/ },
          () => ({ contents: entrySource, loader: "ts" })
        );
      },
    },
  ],
});
assert(bundleBuild.success, String(bundleBuild.logs));
const bundleJs = await bundleBuild.outputs[0]!.text();

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  await page.setContent(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body><main id="stage"></main></body></html>`
  );
  await page.addStyleTag({ content: cssResult.css });
  await page.addScriptTag({ content: bundleJs });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Accessibility.enable");

  const readAXByRole = async (role: string): Promise<AXSummary[]> => {
    const { nodes } = (await cdp.send("Accessibility.getFullAXTree")) as {
      nodes: RawAXNode[];
    };
    const out: AXSummary[] = [];
    for (const n of nodes) {
      if (n.ignored) continue;
      const r = String(n.role?.value ?? "");
      if (r !== role) continue;
      const props: Record<string, unknown> = {};
      for (const p of n.properties ?? []) {
        props[p.name] = p.value?.value;
      }
      out.push({
        role: r,
        name: String(n.name?.value ?? ""),
        props,
      });
    }
    return out;
  };

  // ── A9: Menu & <m-menu> ──────────────────────────────────────────────
  await page.evaluate(async () => {
    const stage = document.getElementById("stage")!;
    stage.innerHTML = "";
    const w = window as unknown as {
      mtrl: {
        createMenu: (cfg: Record<string, unknown>) => {
          open: () => void;
          destroy: () => void;
        };
      };
      __activeMenu?: { destroy: () => void };
    };
    const opener = document.createElement("button");
    opener.id = "menu-opener";
    opener.textContent = "Actions";
    stage.appendChild(opener);
    const menu = w.mtrl.createMenu({
      opener: "#menu-opener",
      ariaLabel: "Actions",
      items: [
        { id: "cut", text: "Cut" },
        {
          id: "share",
          text: "Share",
          hasSubmenu: true,
          submenu: [{ id: "copy", text: "Copy link" }],
        },
      ],
    });
    w.__activeMenu = menu;
    menu.open();
    await new Promise((r) => setTimeout(r, 150));
    const shareItem = document.querySelector<HTMLElement>(
      '[data-id="share"], .mtrl-menu__item:nth-child(2)'
    );
    shareItem?.click();
    await new Promise((r) => setTimeout(r, 200));
  });

  const menuAX = await readAXByRole("menu");
  const menuItemAX = await readAXByRole("menuitem");
  assert(
    menuAX.length >= 2 && menuAX.every((m) => m.name.length > 0),
    `Expected all open menu/submenu AX nodes to have non-empty names, got: ${JSON.stringify(menuAX)}`
  );
  assert(
    menuAX.some((m) => m.name === "Share"),
    `Expected open submenu AX node named "Share", got: ${JSON.stringify(menuAX)}`
  );
  assert(
    menuItemAX.length >= 3 &&
      menuItemAX.every((mi) => mi.props.selected === undefined),
    `Expected unselected menuitem AX nodes to omit selected property, got: ${JSON.stringify(menuItemAX)}`
  );

  // <m-menu> custom element
  const mMenuSelectionAttrs = await page.evaluate(async () => {
    const w = window as unknown as { __activeMenu?: { destroy: () => void } };
    w.__activeMenu?.destroy();
    document.querySelectorAll(".mtrl-menu").forEach((el) => el.remove());
    const stage = document.getElementById("stage")!;
    stage.innerHTML = `
      <button id="el-opener">File</button>
      <m-menu opener="#el-opener" aria-label="File menu" open>
        <m-menu-item value="new">New</m-menu-item>
        <m-menu-item value="save">Save</m-menu-item>
      </m-menu>
    `;
    await new Promise((r) => setTimeout(r, 150));
    const host = stage.querySelector("m-menu")!;
    return Array.from(
      host.shadowRoot!.querySelectorAll('[role="menuitem"]')
    ).map((el) => el.getAttribute("aria-selected"));
  });
  assert.deepEqual(mMenuSelectionAttrs, [null, null]);
  const mMenuAX = await readAXByRole("menu");
  assert(
    mMenuAX.length >= 1 && mMenuAX.every((m) => m.name === "File menu"),
    `Expected <m-menu> AX menu nodes to be named "File menu", got: ${JSON.stringify(mMenuAX)}`
  );

  // ── A10: Search & <m-search> fullscreen dialog ───────────────────────
  await page.evaluate(async () => {
    const stage = document.getElementById("stage")!;
    stage.innerHTML = `<m-search view-mode="fullscreen" open placeholder="Search docs"></m-search>`;
    await new Promise((r) => setTimeout(r, 150));
  });
  const searchDialogAX = await readAXByRole("dialog");
  assert.equal(searchDialogAX.length, 1);
  assert.equal(searchDialogAX[0]!.name, "Search docs");

  // Update <m-search> placeholder and aria-label dynamically
  await page.evaluate(() => {
    const el = document.querySelector("m-search")!;
    el.setAttribute("placeholder", "Find guides");
  });
  assert.equal((await readAXByRole("dialog"))[0]!.name, "Find guides");

  await page.evaluate(() => {
    const el = document.querySelector("m-search")!;
    el.setAttribute("aria-label", "Site search");
  });
  assert.equal((await readAXByRole("dialog"))[0]!.name, "Site search");

  // ── A17: BottomSheet & SideSheet modal and standard AX trees ─────────
  const modalCases: Array<{
    label: string;
    setup: () => Promise<void>;
    expectedName: string;
  }> = [
    {
      label: "createBottomSheet modal top-layer with title",
      expectedName: "Sort by",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = "";
          const w = window as unknown as {
            mtrl: {
              createBottomSheet: (cfg: Record<string, unknown>) => {
                element: HTMLElement;
                open: () => void;
              };
            };
          };
          const bs = w.mtrl.createBottomSheet({
            variant: "modal",
            layer: "top",
            title: "Sort by",
            content: "<p>Options</p>",
          });
          stage.appendChild(bs.element);
          bs.open();
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "createBottomSheet modal top-layer with ariaLabel",
      expectedName: "Sort options",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = "";
          const w = window as unknown as {
            mtrl: {
              createBottomSheet: (cfg: Record<string, unknown>) => {
                element: HTMLElement;
                open: () => void;
              };
            };
          };
          const bs = w.mtrl.createBottomSheet({
            variant: "modal",
            layer: "top",
            ariaLabel: "Sort options",
            content: "<p>Options</p>",
          });
          stage.appendChild(bs.element);
          bs.open();
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "createSideSheet modal top-layer with title",
      expectedName: "Details",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = "";
          const w = window as unknown as {
            mtrl: {
              createSideSheet: (cfg: Record<string, unknown>) => {
                element: HTMLElement;
                open: () => void;
              };
            };
          };
          const ss = w.mtrl.createSideSheet({
            variant: "modal",
            layer: "top",
            title: "Details",
            content: "<p>Body</p>",
          });
          stage.appendChild(ss.element);
          ss.open();
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "<m-bottom-sheet> modal with title attribute",
      expectedName: "Sort by",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = `<m-bottom-sheet variant="modal" title="Sort by" open><p>Body</p></m-bottom-sheet>`;
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "<m-bottom-sheet> modal with aria-label attribute",
      expectedName: "Sort options",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = `<m-bottom-sheet variant="modal" aria-label="Sort options" open><p>Body</p></m-bottom-sheet>`;
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "<m-side-sheet> modal with title attribute",
      expectedName: "Details",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = `<m-side-sheet variant="modal" title="Details" open><p>Body</p></m-side-sheet>`;
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "<m-bottom-sheet> modal with headline attribute",
      expectedName: "Share",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = `<m-bottom-sheet modal headline="Share" open><p>Body</p></m-bottom-sheet>`;
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "<m-side-sheet> modal with headline slot",
      expectedName: "Filters",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = `<m-side-sheet modal open><span slot="headline">Filters</span><p>Body</p></m-side-sheet>`;
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
    {
      label: "<m-side-sheet> modal with aria-label attribute",
      expectedName: "Filter options",
      setup: () =>
        page.evaluate(async () => {
          const stage = document.getElementById("stage")!;
          stage.innerHTML = `<m-side-sheet variant="modal" aria-label="Filter options" open><p>Body</p></m-side-sheet>`;
          await new Promise((r) => setTimeout(r, 100));
        }),
    },
  ];

  for (const c of modalCases) {
    await c.setup();
    const dialogs = await readAXByRole("dialog");
    assert.equal(
      dialogs.length,
      1,
      `${c.label}: expected exactly 1 dialog AX node, got ${JSON.stringify(dialogs)}`
    );
    assert.equal(
      dialogs[0]!.name,
      c.expectedName,
      `${c.label}: expected dialog AX name "${c.expectedName}", got "${dialogs[0]!.name}"`
    );
  }

  // Standard sheets expose named region / complementary landmarks
  await page.evaluate(async () => {
    const stage = document.getElementById("stage")!;
    stage.innerHTML = `
      <m-bottom-sheet variant="standard" aria-label="Music player" open><p>Now playing</p></m-bottom-sheet>
      <m-side-sheet variant="standard" title="Inspector" open><p>Properties</p></m-side-sheet>
    `;
    await new Promise((r) => setTimeout(r, 100));
  });
  const regions = await readAXByRole("region");
  const complementaries = await readAXByRole("complementary");
  assert(
    regions.some((r) => r.name === "Music player"),
    `Expected standard <m-bottom-sheet> region named "Music player", got ${JSON.stringify(regions)}`
  );
  assert(
    complementaries.some((c) => c.name === "Inspector"),
    `Expected standard <m-side-sheet> complementary named "Inspector", got ${JSON.stringify(complementaries)}`
  );

  await context.close();
  console.log("Passed check-a11y-series-c: A9, A10, A17 verified in Chromium AX tree.");
} finally {
  await browser.close();
}

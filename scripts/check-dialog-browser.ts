/** Dialog mounting and keyboard access in a browser that implements inert. */
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import type createDialog from "../src/components/dialog";

const mounts = ["unmoved", "body", "nested", "container", "detached", "top"] as const;
type Mount = typeof mounts[number];
type DialogWindow = Window & {
  createDialog: typeof createDialog;
  mountedDialog: {
    dialog: ReturnType<typeof createDialog>;
    stage: HTMLElement;
    destination: HTMLElement | null;
    trigger: HTMLButtonElement;
    preserved: HTMLElement;
    overflow: string;
    clicks: number;
  };
};

/** The same check runs against the source locally and the packed factory in core:check. */
export async function checkDialogMount(page: Page, selected: readonly Mount[] = mounts): Promise<void> {
  for (const mount of selected) {
    await page.evaluate((mount) => {
      const state = window as unknown as DialogWindow;
      const stage = document.createElement("section");
      const trigger = document.createElement("button");
      trigger.textContent = "Open";
      const preserved = document.createElement("div");
      preserved.setAttribute("inert", "");
      const wrapper = document.createElement("div");
      stage.append(trigger, preserved, wrapper);
      document.body.append(stage);
      const overflow = document.body.style.overflow;
      document.body.style.overflow = "scroll";
      const dialog = state.createDialog({
        title: "Delete file?", animationDuration: 0,
        ...(mount === "container" ? { container: stage } : {}),
        ...(mount === "top" ? { layer: "top" as const } : {}),
        buttons: [
          { text: "Cancel", variant: "text", closeDialog: true },
          { text: "Delete", variant: "text", closeDialog: true, onClick: () => { state.mountedDialog.clicks++; } },
        ],
      });
      dialog.element.id = "mounted-dialog";
      const destination = mount === "nested" ? wrapper : mount === "container" ? stage
        : mount === "body" || mount === "top" ? document.body : null;
      state.mountedDialog = { dialog, stage, trigger, destination, preserved, overflow, clicks: 0 };
      // The documented example moves the surface out of its original overlay.
      if (destination) destination.append(dialog.element);
      if (mount === "detached") dialog.element.remove();
      trigger.focus();
      dialog.open();
    }, mount);

    const visible = () => page.waitForFunction(() => {
      const el = (window as unknown as DialogWindow).mountedDialog.dialog.element;
      return el.classList.contains("mtrl-dialog--visible") && getComputedStyle(el).opacity === "1";
    });
    const active = () => page.evaluate(() => document.activeElement?.textContent?.trim());
    const restored = () => page.evaluate(() => {
      const { dialog, trigger, preserved } = (window as unknown as DialogWindow).mountedDialog;
      return {
        open: dialog.isOpen(), triggerFocused: document.activeElement === trigger,
        backgroundInert: !!trigger.closest("[inert]"), preservedInert: preserved.hasAttribute("inert"),
        overflow: document.body.style.overflow,
      };
    });
    try {
      await visible();
      const before = await page.evaluate(() => {
        const { dialog, trigger } = (window as unknown as DialogWindow).mountedDialog;
        const el = dialog.element;
        return {
          visible: getComputedStyle(el).visibility === "visible" && el.getBoundingClientRect().height > 0,
          inertOnDialog: el.hasAttribute("inert"), inertAncestor: !!el.closest("[inert]"),
          parent: el.parentElement?.className || el.parentElement?.tagName,
          activeTag: document.activeElement?.tagName, active: document.activeElement?.textContent?.trim(),
          backgroundInert: !!trigger.closest("[inert]") || (el instanceof HTMLDialogElement && el.matches(":modal")),
        };
      });
      await page.keyboard.press("Tab");
      const tab = await active();
      console.log(`dialog mount ${mount}: ${JSON.stringify({ ...before, tab })}`);
      assert.equal(before.visible, true, `${mount}: the dialog is visible`);
      assert.equal(before.inertAncestor, false, `${mount}: the open dialog must not be inert`);
      assert.equal(before.active, "Cancel", `${mount}: initial focus reaches the first action`);
      assert.equal(tab, "Delete", `${mount}: Tab reaches the next action`);
      assert.equal(before.backgroundInert, true, `${mount}: the background stays unavailable`);
      await page.keyboard.press("Tab");
      assert.equal(await active(), "Cancel", `${mount}: Tab wraps to the first action`);
      await page.keyboard.press("Shift+Tab");
      assert.equal(await active(), "Delete", `${mount}: Shift+Tab wraps to the last action`);
      await page.keyboard.press("Escape");
      assert.deepEqual(await restored(), {
        open: false, triggerFocused: true, backgroundInert: false, preservedInert: true, overflow: "scroll",
      }, `${mount}: Escape restores focus, inert state and scrolling`);

      // Opening again must repair another external mount and still allow a
      // real pointer click on an action; close/destroy must release the page.
      await page.evaluate(() => {
        const { dialog, destination } = (window as unknown as DialogWindow).mountedDialog;
        if (destination) destination.append(dialog.element);
        dialog.open();
      });
      await visible();
      await page.locator("#mounted-dialog button").filter({ hasText: "Delete" }).click();
      assert.deepEqual(await restored(), {
        open: false, triggerFocused: true, backgroundInert: false, preservedInert: true, overflow: "scroll",
      }, `${mount}: the clicked action closes and restores the page`);
      assert.equal(await page.evaluate(() => (window as unknown as DialogWindow).mountedDialog.clicks), 1);
    } finally {
      await page.evaluate(() => {
        const { dialog, stage, overflow } = (window as unknown as DialogWindow).mountedDialog;
        dialog.destroy();
        stage.remove();
        document.body.style.overflow = overflow;
      });
    }
  }
  console.log(`Passed dialog mounting checks (${selected.length} mounts): initial focus, Tab/Shift+Tab wrap, Escape, pointer action, reopen and background restoration.`);
  await checkDialogScrimScope(page);
}

type ScrimContainer = "static" | "absolute" | "none" | "body";
type ScrimWindow = Window & {
  createDialog: typeof createDialog;
  scrimDialog: {
    dialog: ReturnType<typeof createDialog>;
    container: HTMLElement | null;
  };
};

type ScrimScope = {
  overlayPosition: string;
  scrimMatchesContainer: boolean | null;
  scrimCoversViewport: boolean;
  containerInlineWhileOpen: string | null;
  openAfterOutsideClick?: boolean;
  containerInlineAfterClose?: string | null;
  containerInlineAfterDestroy?: string | null;
};

/**
 * A dialog mounted in a container scopes its scrim to it: the scrim is the
 * container's box, a press on the page outside it does not dismiss, and the
 * container's own inline position (none included) comes back on close and on
 * destroy. A positioned container is left as it is, and the page-level paths
 * (no container, or the body) are unchanged.
 */
export async function checkDialogScrimScope(page: Page): Promise<void> {
  const expected: Record<ScrimContainer, ScrimScope> = {
    static: {
      overlayPosition: "absolute", scrimMatchesContainer: true, scrimCoversViewport: false,
      containerInlineWhileOpen: "relative", openAfterOutsideClick: true,
      containerInlineAfterClose: "", containerInlineAfterDestroy: "",
    },
    absolute: {
      overlayPosition: "absolute", scrimMatchesContainer: true, scrimCoversViewport: false,
      containerInlineWhileOpen: "absolute", openAfterOutsideClick: true,
      containerInlineAfterClose: "absolute", containerInlineAfterDestroy: "absolute",
    },
    none: {
      overlayPosition: "fixed", scrimMatchesContainer: null, scrimCoversViewport: true,
      containerInlineWhileOpen: null, openAfterOutsideClick: false,
      containerInlineAfterClose: null, containerInlineAfterDestroy: null,
    },
    body: {
      overlayPosition: "fixed", scrimMatchesContainer: null, scrimCoversViewport: true,
      containerInlineWhileOpen: null, openAfterOutsideClick: false,
      containerInlineAfterClose: null, containerInlineAfterDestroy: null,
    },
  };

  for (const kind of ["static", "absolute", "none", "body"] as const) {
    await page.evaluate((kind) => {
      const state = window as unknown as ScrimWindow;
      const container = kind === "none" || kind === "body" ? null : document.createElement("section");
      if (container) {
        // A static one carries no position at all: the inline value the
        // dialog takes and must give back is the empty string
        container.style.cssText =
          `${kind === "absolute" ? "position:absolute;" : ""}margin:20px;width:340px;height:240px;background:rgb(200,220,240)`;
        container.textContent = "Region";
        document.body.prepend(container);
      }
      const dialog = state.createDialog({
        title: "Contained?", content: "Body", animationDuration: 0,
        ...(container ? { container } : kind === "body" ? { container: document.body } : {}),
      });
      state.scrimDialog = { dialog, container };
      dialog.open();
    }, kind);

    const visible = () => page.waitForFunction(() => {
      const { dialog } = (window as unknown as ScrimWindow).scrimDialog;
      return getComputedStyle(dialog.overlay).visibility === "visible";
    });
    const inlinePosition = () => page.evaluate(() => {
      const { container } = (window as unknown as ScrimWindow).scrimDialog;
      return container ? container.style.position : null;
    });

    const measured: ScrimScope = { overlayPosition: "", scrimMatchesContainer: null, scrimCoversViewport: false, containerInlineWhileOpen: null };
    try {
      await visible();
      Object.assign(measured, await page.evaluate(() => {
        const { dialog, container } = (window as unknown as ScrimWindow).scrimDialog;
        const scrim = dialog.overlay.getBoundingClientRect();
        const box = container?.getBoundingClientRect();
        return {
          overlayPosition: getComputedStyle(dialog.overlay).position,
          scrimMatchesContainer: box
            ? scrim.x === box.x && scrim.y === box.y && scrim.width === box.width && scrim.height === box.height
            : null,
          scrimCoversViewport: scrim.x === 0 && scrim.y === 0 && scrim.width === window.innerWidth && scrim.height === window.innerHeight,
          containerInlineWhileOpen: container ? container.style.position : null,
        } satisfies ScrimScope;
      }));

      // A press on the page behind the scrim, just outside the container
      const point = await page.evaluate(() => {
        const { container } = (window as unknown as ScrimWindow).scrimDialog;
        const box = container?.getBoundingClientRect();
        return box ? { x: box.right + 10, y: box.bottom + 10 } : { x: window.innerWidth - 10, y: window.innerHeight - 10 };
      });
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await page.mouse.up();
      measured.openAfterOutsideClick = await page.evaluate(() => (window as unknown as ScrimWindow).scrimDialog.dialog.isOpen());

      await page.evaluate(() => {
        const { dialog } = (window as unknown as ScrimWindow).scrimDialog;
        if (dialog.isOpen()) dialog.close();
      });
      await page.waitForFunction(() => {
        const { dialog } = (window as unknown as ScrimWindow).scrimDialog;
        return !dialog.isOpen() && !dialog.overlay.parentNode;
      });
      measured.containerInlineAfterClose = await inlinePosition();

      // Destroy is the other way the dialog lets go of the container
      await page.evaluate(() => (window as unknown as ScrimWindow).scrimDialog.dialog.open());
      await visible();
      await page.evaluate(() => (window as unknown as ScrimWindow).scrimDialog.dialog.destroy());
      measured.containerInlineAfterDestroy = await inlinePosition();
    } finally {
      await page.evaluate(() => {
        const state = window as unknown as ScrimWindow;
        state.scrimDialog.dialog.destroy();
        state.scrimDialog.container?.remove();
      });
    }
    console.log(`dialog scrim ${kind}: ${JSON.stringify(measured)}`);
    assert.deepEqual(measured, expected[kind], `${kind}: the scrim is the container's box and its position comes back`);
  }
  console.log("Passed dialog scrim checks: a contained dialog covers its container, an outside press keeps it open, and the container's inline position returns on close and destroy.");
}

// A focused reproduction without packing or running unrelated core checks.
// Build first for the stylesheet, then: bun run scripts/check-dialog-browser.ts [mount…]
if (import.meta.main) {
  const selected = process.argv.slice(2);
  for (const mount of selected) assert(mounts.includes(mount as Mount), `Unknown mount: ${mount}`);
  const bundle = await Bun.build({ entrypoints: ["src/components/dialog/index.ts"], target: "browser" });
  assert(bundle.success, String(bundle.logs));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addStyleTag({ content: await Bun.file("dist/styles.css").text() });
    await page.evaluate(async (entry) => {
      (window as unknown as DialogWindow).createDialog = (await import(entry)).default;
    }, `data:text/javascript;base64,${Buffer.from(await bundle.outputs[0].text()).toString("base64")}`);
    await checkDialogMount(page, selected.length ? selected as Mount[] : mounts);
    assert.deepEqual(errors, [], "dialog page errors");
  } finally {
    await browser.close();
  }
}

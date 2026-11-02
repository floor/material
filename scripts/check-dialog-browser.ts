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
}

// The trap's reach. A dialog's content can hold a custom element, whose
// controls live in its shadow root -- every component in this library is one.
// The trap uses the shared tabStops/wrapTab, which walk open shadow roots; the
// light-DOM querySelectorAll it replaced could not reach a control in one, so
// the trap stayed on the actions and the content's control was unreachable.
type FocusWindow = Window & {
  createDialog: typeof createDialog;
  focusReachDialog?: ReturnType<typeof createDialog>;
  focusReachTrigger?: HTMLButtonElement;
};

export async function checkDialogFocusReach(page: Page): Promise<void> {
  const deepActive = () => page.evaluate(() => {
    let active: Element | null = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active?.localName ?? "none";
  });
  await page.evaluate(() => {
    class FocusReachField extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" }).innerHTML = '<input aria-label="Inside">';
      }
    }
    if (!customElements.get("focus-reach-field")) customElements.define("focus-reach-field", FocusReachField);
    const state = window as unknown as FocusWindow;
    const trigger = document.createElement("button");
    trigger.textContent = "Edit";
    document.body.append(trigger);
    trigger.focus();
    state.focusReachTrigger = trigger;
    const dialog = state.createDialog({
      title: "Edit name", content: "<focus-reach-field></focus-reach-field>",
      buttons: [{ text: "Done", closeDialog: true }], animationDuration: 0,
    });
    state.focusReachDialog = dialog;
    dialog.open();
  });
  try {
    await page.waitForFunction(() => {
      const dialog = (window as unknown as FocusWindow).focusReachDialog!;
      return dialog.element.classList.contains("mtrl-dialog--visible") && getComputedStyle(dialog.element).opacity === "1";
    });
    assert.equal(await deepActive(), "input", "focus starts in the content's shadow root, not on the actions");
    await page.keyboard.press("Tab");
    assert.equal(await deepActive(), "button", "Tab leaves the shadow control for the dialog's action");
    await page.keyboard.press("Tab");
    assert.equal(await deepActive(), "input", "Tab wraps from the last action back into the shadow content");
    await page.keyboard.press("Shift+Tab");
    assert.equal(await deepActive(), "button", "Shift+Tab wraps from the shadow content to the last action");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => (window as unknown as FocusWindow).focusReachDialog!.isOpen()), false, "Escape still closes it");
    assert.equal(await page.evaluate(() => document.activeElement === (window as unknown as FocusWindow).focusReachTrigger), true, "focus returns to the opener");
  } finally {
    await page.evaluate(() => {
      const state = window as unknown as FocusWindow;
      state.focusReachDialog?.destroy();
      state.focusReachTrigger?.remove();
      state.focusReachDialog = undefined;
      state.focusReachTrigger = undefined;
    });
  }
  console.log("Passed dialog focus reach: the trap starts in shadow content, wraps to the actions, and returns on Escape.");
}

// A control marked aria-hidden is not a candidate for initial focus: the old
// light-DOM filter skipped it, and the shared tab-stop path has to keep that,
// in either direction.
type HiddenFocusWindow = Window & {
  createDialog: typeof createDialog;
  hiddenFocusDialog?: ReturnType<typeof createDialog>;
  hiddenFocusTrigger?: HTMLButtonElement;
};

export async function checkDialogAriaHiddenFocus(page: Page): Promise<void> {
  const visible = () => page.waitForFunction(() => {
    const dialog = (window as unknown as HiddenFocusWindow).hiddenFocusDialog!;
    return dialog.element.classList.contains("mtrl-dialog--visible") && getComputedStyle(dialog.element).opacity === "1";
  });
  for (const dir of ["ltr", "rtl"]) {
    await page.evaluate((dir) => {
      const state = window as unknown as HiddenFocusWindow;
      const trigger = document.createElement("button");
      trigger.textContent = "Open";
      document.body.append(trigger);
      trigger.focus();
      const dialog = state.createDialog({
        title: "Edit name", animationDuration: 0,
        content: '<input id="hidden" aria-hidden="true"><input id="visible">',
        buttons: [{ text: "Done", closeDialog: true }],
      });
      dialog.element.dir = dir;
      state.hiddenFocusDialog = dialog;
      state.hiddenFocusTrigger = trigger;
      dialog.open();
    }, dir);
    await visible();
    assert.equal(
      await page.evaluate(() => document.activeElement?.id ?? ""),
      "visible",
      `${dir}: initial focus skips a control marked aria-hidden`,
    );
    await page.evaluate(() => {
      const state = window as unknown as HiddenFocusWindow;
      state.hiddenFocusDialog!.destroy();
      state.hiddenFocusTrigger!.remove();
    });
  }
  console.log("Passed dialog aria-hidden focus: initial focus skips a control marked aria-hidden in left-to-right and right-to-left.");
}

// A focused reproduction without packing or running unrelated core checks.
// Build first for the stylesheet, then: bun run scripts/check-dialog-browser.ts [mount…|focus|hidden]
if (import.meta.main) {
  const selected = process.argv.slice(2);
  for (const mount of selected) assert(mount === "focus" || mount === "hidden" || mounts.includes(mount as Mount), `Unknown mount: ${mount}`);
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
    const mountNames = selected.filter((name) => name !== "focus" && name !== "hidden") as Mount[];
    if (!selected.length || mountNames.length) await checkDialogMount(page, mountNames.length ? mountNames : mounts);
    if (selected.includes("focus")) await checkDialogFocusReach(page);
    if (selected.includes("hidden")) await checkDialogAriaHiddenFocus(page);
    assert.deepEqual(errors, [], "dialog page errors");
  } finally {
    await browser.close();
  }
}

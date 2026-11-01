/**
 * FLO-1073. Read 2026-11-01:
 * https://m3.material.io/components/badges/accessibility
 * "non-counting badges will simply announce New notification."
 * Measure Chromium's accessibility tree, including the implicit live region,
 * for a factory dot and the real shadow-root element, outside any website.
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";

export async function checkBadgeAnnouncement(page: Page, check: (name: string) => void): Promise<void> {
  await page.evaluate(() => {
    type Badge = {
      element: HTMLElement;
      setLabel(label: string | number): unknown;
      setVariant(variant: string): unknown;
      hide(): unknown;
      show(): unknown;
      destroy(): unknown;
    };
    const w = window as unknown as {
      mtrl: {
        createBadge(config: Record<string, unknown>): Badge;
        withBadge(config: Record<string, unknown>): (host: { element: HTMLElement }) => { badge: Badge };
      };
      __dotCheck?: { factory: Badge; attached: Badge; button: HTMLButtonElement; stage: HTMLElement };
    };
    const stage = document.createElement("div");
    stage.id = "badge-announcement-check";
    document.body.append(stage);
    const factory = w.mtrl.createBadge({ variant: "small" });
    factory.element.id = "dot-factory";
    stage.append(factory.element);
    const element = document.createElement("m-badge");
    element.id = "dot-element";
    element.setAttribute("variant", "small");
    stage.append(element);
    const button = document.createElement("button");
    button.id = "dot-destination";
    button.textContent = "Notification destination";
    stage.append(button);
    const attached = w.mtrl.withBadge({ badge: 1, badgeConfig: { variant: "small" } })({ element: button }).badge;
    w.__dotCheck = { factory, attached, button, stage };
  });
  const client = await page.context().newCDPSession(page);
  type AXNode = {
    ignored: boolean;
    role?: { value: string };
    name?: { value: string };
    description?: { value: string };
    properties?: { name: string; value: { value: unknown } }[];
  };
  const read = async (expression: string) => {
    const { result } = await client.send("Runtime.evaluate", { expression });
    assert(result.objectId, expression);
    const { nodes } = await client.send("Accessibility.getPartialAXTree", { objectId: result.objectId, fetchRelatives: false });
    const node = nodes[0] as AXNode;
    await client.send("Runtime.releaseObject", { objectId: result.objectId });
    return {
      ignored: node.ignored,
      role: node.role?.value ?? null,
      name: node.name?.value ?? null,
      live: node.properties?.find(p => p.name === "live")?.value.value ?? null,
      description: node.description?.value ?? null,
    };
  };
  const snapshot = async () => {
    // Flush mutations and custom-element attribute updates without a time sleep.
    await page.evaluate(async () => { await Promise.resolve(); });
    const attributes = await page.evaluate(() => {
      const f = document.getElementById("dot-factory")!;
      const e = document.getElementById("dot-element")!.shadowRoot!.querySelector("[part=badge]")!;
      const state = (node: Element) => ({ role: node.getAttribute("role"), name: node.getAttribute("aria-label"), live: node.getAttribute("aria-live"), hidden: node.getAttribute("aria-hidden"), text: node.textContent });
      return { factory: state(f), element: state(e) };
    });
    return {
      attributes,
      factory: await read('document.getElementById("dot-factory")'),
      element: await read('document.getElementById("dot-element").shadowRoot.querySelector("[part=badge]")'),
      destination: await read('document.getElementById("dot-destination")'),
    };
  };
  const measurements: Record<string, Awaited<ReturnType<typeof snapshot>>> = {};
  try {
    measurements.initial = await snapshot();
    await page.evaluate(() => {
      const w = window as unknown as { __dotCheck: { factory: { setLabel(label: string): void }; attached: { setLabel(label: string): void } } };
      w.__dotCheck.factory.setLabel("Nouvelle notification");
      w.__dotCheck.attached.setLabel("Nouvelle notification");
      document.getElementById("dot-element")!.setAttribute("label", "Nouvelle notification");
    });
    measurements.localized = await snapshot();
    await page.evaluate(() => {
      const w = window as unknown as { __dotCheck: { factory: { setLabel(label: string): void }; attached: { setLabel(label: string): void } } };
      w.__dotCheck.factory.setLabel("7");
      w.__dotCheck.attached.setLabel("7");
      document.getElementById("dot-element")!.setAttribute("label", "7");
    });
    measurements.numericString = await snapshot();
    await page.evaluate(() => {
      const w = window as unknown as { __dotCheck: { factory: { setVariant(variant: string): void }; attached: { setVariant(variant: string): void } } };
      w.__dotCheck.factory.setVariant("large");
      w.__dotCheck.attached.setVariant("large");
      document.getElementById("dot-element")!.setAttribute("variant", "large");
    });
    measurements.count = await snapshot();
    await page.evaluate(() => {
      const w = window as unknown as { __dotCheck: { factory: { setVariant(variant: string): void }; attached: { setVariant(variant: string): void } } };
      w.__dotCheck.factory.setVariant("small");
      w.__dotCheck.attached.setVariant("small");
      document.getElementById("dot-element")!.setAttribute("variant", "small");
    });
    measurements.restored = await snapshot();
    await page.evaluate(() => {
      const w = window as unknown as { __dotCheck: { factory: { hide(): void }; attached: { hide(): void } } };
      w.__dotCheck.factory.hide();
      w.__dotCheck.attached.hide();
      (document.getElementById("dot-element") as HTMLElement & { visible: boolean }).visible = false;
    });
    measurements.hidden = await snapshot();
    await page.evaluate(() => {
      const w = window as unknown as { __dotCheck: { factory: { show(): void }; attached: { show(): void } } };
      w.__dotCheck.factory.show();
      w.__dotCheck.attached.show();
      (document.getElementById("dot-element") as HTMLElement & { visible: boolean }).visible = true;
    });
    measurements.shown = await snapshot();
    console.log(`Badge announcement measurements: ${JSON.stringify(measurements)}`);
    const failures: string[] = [];
    for (const [state, data] of Object.entries(measurements)) {
      for (const path of ["factory", "element"] as const) {
        const actual = data[path];
        const attrs = data.attributes[path];
        if (state === "hidden") {
          if (!actual.ignored) failures.push(`${state}/${path}: exposed hidden badge`);
          continue;
        }
        const expectedName = state === "count" ? "" : state === "localized" ? "Nouvelle notification" : "New notification";
        if (actual.ignored || actual.role !== "status" || actual.name !== expectedName || actual.live !== "polite" || attrs.hidden !== null) {
          failures.push(`${state}/${path}: ${JSON.stringify({ ...actual, ariaHidden: attrs.hidden })}, expected exposed status/${expectedName}/polite`);
        }
        if (state !== "count" && attrs.text !== "") failures.push(`${state}/${path}: dot rendered text`);
        if (state === "count" && (attrs.name !== null || attrs.text !== "7")) failures.push(`${state}/${path}: stale dot label masked count`);
      }
      const description = state === "hidden" ? null : state === "count" ? "7" : state === "localized" ? "Nouvelle notification" : "New notification";
      if (data.destination.name !== "Notification destination" || data.destination.description !== description) {
        failures.push(`${state}/destination: ${JSON.stringify(data.destination)}, expected unchanged name and description ${description}`);
      }
    }
    assert.equal(failures.length, 0, failures.join("\n"));
    check("badge: factory and element dots expose New notification in the accessibility tree, with a polite live region; destination descriptions follow label, variant and visibility");
  } finally {
    await client.detach();
    await page.evaluate(() => {
      const w = window as unknown as { __dotCheck?: { factory: { destroy(): void }; attached: { destroy(): void }; stage: HTMLElement } };
      w.__dotCheck?.factory.destroy();
      w.__dotCheck?.attached.destroy();
      w.__dotCheck?.stage.remove();
      delete w.__dotCheck;
    });
  }
}

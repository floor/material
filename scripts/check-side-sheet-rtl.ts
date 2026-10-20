// #112: closed side sheets must leave the viewport on their logical edge.
// Called by rtl:check before the other fixtures, against the built package.
import assert from "node:assert/strict";
import type { Page } from "playwright";

export async function checkSideSheetRtl(page: Page): Promise<void> {
  const failures = await page.evaluate(async () => {
    type Sheet = { element: HTMLElement; open(): void; close(): void; destroy(): void };
    type Host = HTMLElement & { show(): void; close(): void };
    const { createSideSheet } = (window as unknown as {
      mtrl: { createSideSheet(config: { position: string; width: number; variant: string; title: string }): Sheet };
    }).mtrl;
    const frame = (): Promise<void> => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => done())));
    const failures: string[] = [];
    const viewport = window.innerWidth;
    const originalDirection = document.documentElement.dir;
    for (const mode of ["element", "standard", "modal"]) {
      for (const position of ["end", "start"]) {
        for (const width of [256, 400]) {
          document.documentElement.dir = "ltr";
          let host: Host | undefined;
          let factory: Sheet | undefined;
          if (mode === "element") {
            host = document.createElement("m-side-sheet") as Host;
            host.setAttribute("position", position);
            host.setAttribute("width", String(width));
            host.setAttribute("headline", "Filters");
            document.body.append(host);
          } else {
            factory = createSideSheet({ position, width, variant: mode, title: "Filters" });
            document.body.append(factory.element);
          }
          const root = host?.shadowRoot ?? factory!.element;
          const container = root.querySelector<HTMLElement>(".mtrl-side-sheet__container")!;
          const label = `${mode} ${position} width=${width}`;
          const measure = (state: string, open: boolean): void => {
            const rtl = document.documentElement.dir === "rtl";
            const leftEdge = (position === "start") !== rtl;
            const expected = open ? (leftEdge ? 0 : viewport - width) : (leftEdge ? -width : viewport);
            const rect = container.getBoundingClientRect();
            if (Math.abs(rect.x - expected) > 0.5 || Math.abs(rect.width - width) > 0.5) {
              failures.push(`${label} ${state} ${rtl ? "RTL" : "LTR"}: x=${rect.x} width=${rect.width}; expected x=${expected} width=${width}`);
            }
            // The solid overshoot cover must stay outside the docked edge;
            // otherwise even a correctly translated closed sheet paints 32px
            // back into the viewport. Modal elevation remains a separate shadow.
            const shadow = getComputedStyle(container).boxShadow;
            const guard = Number(shadow.match(/(-?\d+(?:\.\d+)?)px 0px 0px 0px(?:,|$)/)?.[1]);
            if (guard !== (leftEdge ? -32 : 32)) {
              failures.push(`${label} ${state} ${rtl ? "RTL" : "LTR"}: overshoot shadow x=${guard}; expected ${leftEdge ? -32 : 32}`);
            }
          };
          const show = (): void => { if (host) host.show(); else factory!.open(); };
          const close = (): void => { if (host) host.close(); else factory!.close(); };
          // Direction changes on an already-connected sheet, both closed and
          // open, must follow the same geometry as the initial LTR rendering.
          await frame();
          measure("initial closed", false);
          for (const direction of ["rtl", "ltr"]) {
            document.documentElement.dir = direction;
            await frame();
            measure("closed", false);
            show();
            await frame();
            measure("open", true);
            document.documentElement.dir = direction === "rtl" ? "ltr" : "rtl";
            await frame();
            measure("open after dir change", true);
            close();
            await frame();
            measure("closed again", false);
          }
          if (host) host.remove(); else factory!.destroy();
        }
      }
    }
    document.documentElement.dir = originalDirection;
    return failures;
  });
  assert.deepEqual(failures, [], `Side sheets must close off-screen on their logical edge:\n${failures.join("\n")}`);
  console.log("Passed side-sheet RTL: 12 fixtures (element, standard/modal factories; start/end; 256/400px), closed/open/closed and runtime direction changes in both directions.");
}

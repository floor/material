/** `<m-bottom-sheet variant>` and `<m-side-sheet variant>`: declared, so a later change rebuilds the sheet. */
import assert from "node:assert/strict";
import type { Page } from "playwright";

/**
 * `variant="modal"` is the same modal sheet as the boolean `modal` attribute.
 * The sheet is created from the host attribute. A change after upgrade has to
 * be observed, or the sheet stays whatever it was built as.
 */
export async function checkSheetVariant(page: Page, check: (name: string) => void): Promise<void> {
  const result = await page.evaluate(async () => {
    const settle = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    type Shape = { tag: string; modal: boolean; standard: boolean; role: string | null; variant: string | null };
    const read = (host: HTMLElement): Shape => {
      const root = host.shadowRoot?.querySelector(".mtrl-bottom-sheet, .mtrl-side-sheet") as HTMLElement | null;
      const container = host.shadowRoot?.querySelector(".mtrl-bottom-sheet__container, .mtrl-side-sheet__container") as HTMLElement | null;
      const reflected = host as HTMLElement & { variant?: string | null };
      return {
        tag: root?.localName ?? "",
        modal: root?.classList.contains("mtrl-bottom-sheet--modal") === true || root?.classList.contains("mtrl-side-sheet--modal") === true,
        standard: root?.classList.contains("mtrl-bottom-sheet--standard") === true || root?.classList.contains("mtrl-side-sheet--standard") === true,
        role: container?.getAttribute("role") ?? null,
        variant: reflected.variant ?? null,
      };
    };
    const stage = document.createElement("div");
    stage.id = "sheet-variant-stage";
    document.body.append(stage);
    const observed = (tag: string): boolean => {
      const ctor = customElements.get(tag) as { observedAttributes?: readonly string[] } | undefined;
      return ctor?.observedAttributes?.includes("variant") === true;
    };
    const out: Record<string, unknown> = {};
    for (const tag of ["m-bottom-sheet", "m-side-sheet"]) {
      const host = document.createElement(tag);
      host.setAttribute("headline", "Title");
      stage.append(host);
      await settle();
      const before = read(host);
      host.setAttribute("variant", "modal");
      await settle();
      const modal = read(host);
      host.removeAttribute("variant");
      await settle();
      out[tag] = { before, modal, removed: read(host), observed: observed(tag) };
    }
    stage.replaceChildren();
    stage.innerHTML = `<m-bottom-sheet id="sheet-variant-bottom" variant="modal" headline="Title"></m-bottom-sheet>` +
      `<m-side-sheet id="sheet-variant-side" variant="modal" headline="Title"></m-side-sheet>`;
    await settle();
    out.initial = {
      bottom: read(document.getElementById("sheet-variant-bottom")!),
      side: read(document.getElementById("sheet-variant-side")!),
    };
    stage.remove();
    return out;
  });

  const standard = { tag: "div", modal: false, standard: true, variant: null };
  const modal = { tag: "dialog", modal: true, standard: false, role: null, variant: "modal" };
  const sheets = result as {
    "m-bottom-sheet": { before: { tag: string; modal: boolean; standard: boolean; role: string | null; variant: string | null }; modal: typeof modal; removed: { tag: string; modal: boolean; standard: boolean; role: string | null; variant: string | null }; observed: boolean };
    "m-side-sheet": { before: { tag: string; modal: boolean; standard: boolean; role: string | null; variant: string | null }; modal: typeof modal; removed: { tag: string; modal: boolean; standard: boolean; role: string | null; variant: string | null }; observed: boolean };
    initial: { bottom: typeof modal; side: typeof modal };
  };
  assert.equal(sheets["m-bottom-sheet"].observed, true);
  assert.equal(sheets["m-side-sheet"].observed, true);
  assert.deepEqual(sheets["m-bottom-sheet"].before, { ...standard, role: "region" });
  assert.deepEqual(sheets["m-bottom-sheet"].modal, modal);
  assert.deepEqual(sheets["m-bottom-sheet"].removed, { ...standard, role: "region" });
  assert.deepEqual(sheets["m-side-sheet"].before, { ...standard, role: "complementary" });
  assert.deepEqual(sheets["m-side-sheet"].modal, modal);
  assert.deepEqual(sheets["m-side-sheet"].removed, { ...standard, role: "complementary" });
  assert.deepEqual(sheets.initial, { bottom: modal, side: modal });
  check("sheets: variant=modal is a dialog at mount and after a later change, and removing it restores the standard sheet");
}

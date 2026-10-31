/** `<m-button icon-position="end">`: the icon after the label. */
import assert from "node:assert/strict";
import type { Page } from "playwright";

/**
 * The factory takes `iconPosition: "end"` and moves the icon after the label
 * with the `__icon--end` class; the element could not express it. The buttons
 * guidelines say icons "should be placed on the leading side of the button,
 * before the label text" — the leading placement stays the default; the end
 * is the factory's opt-in for a trailing action such as a Next button
 * (m3.material.io/components/buttons/guidelines, read 2026-10-30). This
 * checks the wiring: the attribute at mount, the insets the component swaps
 * for an end icon at the default and text variants, the explicit "start"
 * value, and the attribute changed and removed after upgrade.
 */
export async function checkButtonIconPosition(page: Page, check: (name: string) => void): Promise<void> {
  const result = await page.evaluate(async () => {
    const host = document.getElementById("host")!;
    host.replaceChildren();
    const settle = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const ICON = "<svg viewBox='0 0 24 24'><path d='M4 4h16v16H4z'/></svg>";
    const mk = (attrs: Record<string, string>, label: string) => {
      const el = document.createElement("m-button");
      el.textContent = label;
      for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
      host.append(el);
      return el as HTMLElement;
    };
    const inner = (el: HTMLElement) => el.shadowRoot!.querySelector("button")!;
    const look = (el: HTMLElement) => {
      const icon = el.shadowRoot!.querySelector(".mtrl-button__icon")!;
      const label = el.shadowRoot!.querySelector(".mtrl-button__text")!;
      const cs = getComputedStyle(inner(el));
      return {
        endClass: icon.classList.contains("mtrl-button__icon--end"),
        iconAfterLabel: !!(icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_PRECEDING),
        padding: `${cs.paddingInlineStart}/${cs.paddingInlineEnd}`,
      };
    };
    const out: Record<string, unknown> = {};

    // At mount, at the default size and variant: the icon trails the label
    // and the small icon inset swaps to the end side (16 before the label,
    // 12 beside the icon).
    const end = mk({ icon: ICON, "icon-position": "end" }, "Next");
    await settle();
    out.end = look(end);

    // The text variant swaps the same way: 16 before the label, 12 after.
    const textEnd = mk({ icon: ICON, "icon-position": "end", variant: "text" }, "Next");
    await settle();
    out.textEnd = look(textEnd);

    // An explicit start keeps the leading placement.
    const start = mk({ icon: ICON, "icon-position": "start" }, "Back");
    await settle();
    out.start = look(start);

    // No icon attribute: the position has nothing to place.
    const bare = mk({ "icon-position": "end" }, "Bare");
    await settle();
    out.bare = { hasIcon: !!bare.shadowRoot!.querySelector(".mtrl-button__icon") };

    // The attribute after upgrade moves the icon; removing it moves it back.
    const moved = mk({ icon: ICON }, "Continue");
    await settle();
    moved.setAttribute("icon-position", "end");
    await settle();
    out.movedToEnd = look(moved);
    moved.removeAttribute("icon-position");
    await settle();
    out.movedBack = look(moved);
    return out;
  });

  assert.deepEqual(result.end, { endClass: true, iconAfterLabel: true, padding: "16px/12px" });
  check("button element: icon-position end at mount places the icon after the label and swaps the small insets");

  assert.deepEqual(result.textEnd, { endClass: true, iconAfterLabel: true, padding: "16px/12px" });
  check("button element: icon-position end swaps the text variant's insets the same way");

  assert.deepEqual(result.start, { endClass: false, iconAfterLabel: false, padding: "12px/16px" });
  check("button element: icon-position start keeps the leading icon and its insets");

  assert.deepEqual(result.bare, { hasIcon: false });
  check("button element: icon-position without an icon places nothing");

  assert.deepEqual(result.movedToEnd, { endClass: true, iconAfterLabel: true, padding: "16px/12px" });
  assert.deepEqual(result.movedBack, { endClass: false, iconAfterLabel: false, padding: "12px/16px" });
  check("button element: icon-position changed after upgrade moves the icon, and removing it moves it back");
}

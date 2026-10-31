/** `<m-button toggle>`: the selected state, its attribute and its property. */
import assert from "node:assert/strict";
import type { Page } from "playwright";

/**
 * The element could not express the factory's toggle: no `toggle` attribute,
 * no selected state, no `change` (issue #85). The toggle buttons guidelines
 * say a toggle "should be used for binary selections, such as Save or
 * Favorite" and "when toggle buttons are pressed, they can change color,
 * shape, and labels", and "by default, toggle buttons change from round to
 * square when selected" (m3.material.io/components/buttons/guidelines, read
 * 2026-10-30) — the shape swap is the `--toggle`/`--selected` classes the
 * factory already applies. This checks the element wiring: the attributes at
 * mount, the `change` a click on the button dispatches from the host with
 * `{ selected, value }`, the live `selected` property, an attribute change
 * after upgrade while the state is still the attribute's, the attribute no
 * longer moving a script-changed state, `toggle` itself added and removed
 * after upgrade, and a form reset restoring the attribute's default.
 */
export async function checkButtonToggle(page: Page, check: (name: string) => void): Promise<void> {
  const result = await page.evaluate(async () => {
    const host = document.getElementById("host")!;
    host.replaceChildren();
    const settle = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const mk = (attrs: Record<string, string>, label: string) => {
      const el = document.createElement("m-button");
      el.textContent = label;
      for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
      host.append(el);
      return el as HTMLElement & { selected?: boolean };
    };
    const inner = (el: HTMLElement) => el.shadowRoot!.querySelector("button")!;
    const state = (el: HTMLElement) => ({
      pressed: inner(el).getAttribute("aria-pressed"),
      toggleClass: inner(el).classList.contains("mtrl-button--toggle"),
      selectedClass: inner(el).classList.contains("mtrl-button--selected"),
    });
    const out: Record<string, unknown> = {};

    // At mount: the selected attribute is the default state.
    const first = mk({ toggle: "", selected: "", value: "bold" }, "Bold");
    await settle();
    out.mount = state(first);

    // A click on the button dispatches change from the host with the
    // selected state and the value.
    const seen: unknown[] = [];
    first.addEventListener("change", (event) => seen.push((event as CustomEvent).detail));
    inner(first).click();
    inner(first).click();
    await settle();
    out.clicks = { seen, after: state(first), property: first.selected };

    // The property is the live state; setting it moves the button.
    first.selected = false;
    await settle();
    out.propertySet = { state: state(first), property: first.selected };

    // After the script change, the attribute no longer moves the state.
    first.setAttribute("selected", "");
    await settle();
    out.attributeAfterScript = state(first);

    // On a fresh element, before any user or script change, the attribute
    // moves the state in place, and removing it moves it back.
    const second = mk({ toggle: "" }, "Tag");
    await settle();
    second.setAttribute("selected", "");
    await settle();
    out.attributeMovesDefault = state(second);
    second.removeAttribute("selected");
    await settle();
    out.attributeRemoved = state(second);
    out.propertyDefault = second.selected;

    // toggle itself, added and removed after upgrade.
    const third = mk({}, "Plain");
    await settle();
    third.setAttribute("toggle", "");
    await settle();
    const thirdSeen: unknown[] = [];
    third.addEventListener("change", (event) => thirdSeen.push((event as CustomEvent).detail));
    inner(third).click();
    await settle();
    out.toggleAdded = { state: state(third), seen: [...thirdSeen] };
    third.removeAttribute("toggle");
    await settle();
    inner(third).click();
    await settle();
    out.toggleRemoved = { state: state(third), seen: [...thirdSeen] };

    // A selected attribute without toggle selects nothing.
    const fourth = mk({ selected: "" }, "No toggle");
    await settle();
    out.selectedWithoutToggle = { state: state(fourth), property: fourth.selected };

    // The form's reset restores the attribute's default.
    const form = document.createElement("form");
    const fifth = document.createElement("m-button");
    fifth.setAttribute("toggle", "");
    fifth.textContent = "In form";
    form.append(fifth);
    host.append(form);
    await settle();
    const fifthSeen: unknown[] = [];
    fifth.addEventListener("change", (event) => fifthSeen.push((event as CustomEvent).detail));
    inner(fifth).click();
    await settle();
    const before = inner(fifth).getAttribute("aria-pressed");
    form.reset();
    await settle();
    out.formReset = { seen: [...fifthSeen], before, after: inner(fifth).getAttribute("aria-pressed"), property: fifth.selected };
    return out;
  });

  assert.deepEqual(result.mount, { pressed: "true", toggleClass: true, selectedClass: true });
  check("button element: toggle and selected at mount carry the toggle classes and aria-pressed");

  assert.deepEqual(result.clicks, {
    seen: [{ selected: false, value: "bold" }, { selected: true, value: "bold" }],
    after: { pressed: "true", toggleClass: true, selectedClass: true },
    property: true,
  });
  check("button element: a click dispatches change with the selected state and the value from the host");

  assert.deepEqual(result.propertySet, { state: { pressed: "false", toggleClass: true, selectedClass: false }, property: false });
  check("button element: the selected property is the live state");

  assert.deepEqual(result.attributeAfterScript, { pressed: "false", toggleClass: true, selectedClass: false });
  check("button element: after a script change the selected attribute no longer moves the state");

  assert.deepEqual(result.attributeMovesDefault, { pressed: "true", toggleClass: true, selectedClass: true });
  assert.deepEqual(result.attributeRemoved, { pressed: "false", toggleClass: true, selectedClass: false });
  assert.equal(result.propertyDefault, false);
  check("button element: while the state is still the attribute's, setting and removing it moves the state");

  assert.deepEqual(result.toggleAdded, {
    state: { pressed: "true", toggleClass: true, selectedClass: true },
    seen: [{ selected: true, value: "" }],
  });
  assert.deepEqual(result.toggleRemoved, {
    state: { pressed: null, toggleClass: false, selectedClass: false },
    seen: [{ selected: true, value: "" }],
  });
  check("button element: the toggle attribute added after upgrade turns the button into a toggle, removed it turns it back");

  assert.deepEqual(result.selectedWithoutToggle, { state: { pressed: null, toggleClass: false, selectedClass: false }, property: false });
  check("button element: a selected attribute without toggle selects nothing");

  assert.deepEqual(result.formReset, { seen: [{ selected: true, value: "" }], before: "true", after: "false", property: false });
  check("button element: a form reset restores the selected attribute's default");
}

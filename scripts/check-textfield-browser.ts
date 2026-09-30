/**
 * The text field's label rules, rendered from the packed CSS (FLO-303).
 *
 * The label comes before the input in the DOM, so every `__input… ~ __label`
 * rule matched nothing: the label floated only through the script's --empty
 * and --focused classes. These cases change the input's state without them —
 * a value set on the input directly, an input disabled directly — and measure
 * the label the page renders.
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createTextfield from "../src/components/textfield";

type FieldWindow = Window & {
  inputs: { createTextfield: typeof createTextfield };
  fields: { destroy: () => void }[];
};

export async function checkTextfield(page: Page): Promise<void> {
  const measured = await page.evaluate(() => {
    const state = window as unknown as FieldWindow;
    const { createTextfield } = state.inputs;
    const make = (variant: "filled" | "outlined") => {
      const field = createTextfield({ label: "Name", variant });
      field.element.style.width = "280px";
      document.body.append(field.element);
      return field;
    };
    const filled = make("filled");
    const outlined = make("outlined");
    const disabled = make("filled");
    state.fields = [filled, outlined, disabled];
    const label = (field: { element: HTMLElement }) => field.element.querySelector("label") as HTMLElement;
    const rest = { filled: label(filled).getBoundingClientRect().top, outlined: label(outlined).getBoundingClientRect().top };
    // A value the script never saw: no input event, so --empty stays.
    filled.input.value = "Ada";
    outlined.input.value = "Ada";
    disabled.input.disabled = true;
    const top = (field: { element: HTMLElement }) => label(field).getBoundingClientRect().top - field.element.getBoundingClientRect().top;
    return {
      stillEmpty: filled.element.classList.contains("mtrl-textfield--empty") && outlined.element.classList.contains("mtrl-textfield--empty"),
      filledRose: rest.filled - label(filled).getBoundingClientRect().top,
      filledTop: top(filled),
      outlinedRose: rest.outlined - label(outlined).getBoundingClientRect().top,
      outlinedTop: top(outlined),
      outlinedOpacity: getComputedStyle(label(outlined)).opacity,
      disabledOpacity: getComputedStyle(label(disabled)).opacity,
      restingOpacity: getComputedStyle(label(filled)).opacity,
    };
  });
  assert.equal(measured.stillEmpty, true, "the case needs a value the script did not see");
  // Floated: the filled label rises into the container's top, the outlined one onto the outline.
  assert.ok(measured.filledRose > 8, `filled label should float, rose ${measured.filledRose}px`);
  assert.ok(measured.filledTop >= 0 && measured.filledTop < 16, `filled floated label top ${measured.filledTop}px`);
  assert.ok(measured.outlinedRose > 16, `outlined label should float, rose ${measured.outlinedRose}px`);
  assert.ok(measured.outlinedTop < 0, `outlined floated label sits on the outline, top ${measured.outlinedTop}px`);
  assert.equal(measured.outlinedOpacity, "1");
  // Disabled on the input alone still dims its label.
  assert.equal(measured.disabledOpacity, "0.38");
  assert.equal(measured.restingOpacity, "1");
  await page.evaluate(() => (window as unknown as FieldWindow).fields.forEach(field => field.destroy()));
  console.log("Passed text field label: floats from the input's own value (filled, outlined) and dims with a disabled input.");
}

type Probe = { element: HTMLElement; input: HTMLInputElement; setError: (e: boolean) => unknown; destroy: () => void };

/**
 * The text field's colours and states against the Compose tokens, rendered
 * from the packed CSS (FLO-298). Each expected colour is the theme role
 * resolved in the same page, so the check follows the theme, not a hex.
 */
export async function checkTextfieldTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as unknown as FieldWindow & { probes: Record<string, Probe> };
    const { createTextfield } = state.inputs;
    const icon = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
    const make = (config: Record<string, unknown>) => {
      const field = createTextfield({ label: "Name", ...config } as never) as unknown as Probe;
      field.element.style.width = "280px";
      field.element.style.margin = "24px";
      document.body.append(field.element);
      return field;
    };
    state.probes = {
      filled: make({ variant: "filled", placeholder: "Type" }),
      outlined: make({ variant: "outlined" }),
      bare: make({ variant: "filled", label: "", placeholder: "Search" }),
      error: make({ variant: "filled", leadingIcon: icon, trailingIcon: icon, prefixText: "$", error: true }),
      outlinedError: make({ variant: "outlined", trailingIcon: icon, error: true }),
      disabled: make({ variant: "filled", disabled: true, supportingText: "Help" }),
      outlinedDisabled: make({ variant: "outlined", disabled: true }),
    };
  });
  const read = (script: string) => page.evaluate((code) => {
    const probes = (window as unknown as { probes: Record<string, Probe> }).probes;
    const role = (name: string, alpha?: number): string => {
      const probe = document.createElement("i");
      probe.style.color = alpha === undefined ? `var(--mtrl-sys-color-${name})`
        : `color-mix(in srgb, var(--mtrl-sys-color-${name}) ${alpha * 100}%, transparent)`;
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    const q = (name: string, selector: string) => probes[name].element.querySelector(selector) as HTMLElement;
    const style = (name: string, selector: string, pseudo?: string) => getComputedStyle(q(name, selector), pseudo);
    return new Function("probes", "role", "q", "style", code)(probes, role, q, style);
  }, script);
  const hover = async (name: string) => page.locator(`.mtrl-textfield >> nth=${await page.evaluate((n) => [...document.querySelectorAll(".mtrl-textfield")].indexOf((window as unknown as { probes: Record<string, Probe> }).probes[n].element), name)}`).hover().then(() => page.waitForTimeout(400)); // past the colour transitions

  const rest = await read(`return {
    indicator: style("filled", "input").borderBottomColor === role("on-surface-variant"),
    caret: style("filled", "input").caretColor === role("primary"),
    placeholderUnderLabel: style("filled", "input", "::placeholder").color === "rgba(0, 0, 0, 0)",
    placeholderNoLabel: style("bare", "input", "::placeholder").color === role("on-surface-variant"),
    outlinedLabel: [style("outlined", "label").opacity, style("outlined", "label").color === role("on-surface-variant")],
    errorLeading: style("error", ".mtrl-textfield__leading-icon").color === role("on-surface-variant"),
    errorTrailing: style("error", ".mtrl-textfield__trailing-icon").color === role("error"),
    errorPrefix: style("error", ".mtrl-textfield__prefix").color === role("on-surface-variant"),
    errorCaret: style("error", "input").caretColor === role("error"),
    errorIndicator: [style("error", "input").borderBottomColor === role("error"), getComputedStyle(q("error", ".mtrl-textfield__field"), "::before").opacity],
    icons: [style("error", ".mtrl-textfield__leading-icon").opacity, style("error", ".mtrl-textfield__leading-icon svg").width],
    disabledFill: [style("disabled", "input").opacity, style("disabled", "input").backgroundColor === role("on-surface", 0.04), style("disabled", "input").borderBottomColor === role("on-surface", 0.38)],
    disabledText: style("disabled", "input").color === role("on-surface", 0.38),
    disabledHelper: style("disabled", ".mtrl-textfield__supporting").opacity,
    outlinedDisabledFill: style("outlinedDisabled", "input").backgroundColor,
  };`);
  assert.deepEqual(rest, {
    indicator: true, caret: true, placeholderUnderLabel: true, placeholderNoLabel: true,
    outlinedLabel: ["1", true],
    errorLeading: true, errorTrailing: true, errorPrefix: true, errorCaret: true, errorIndicator: [true, "0"],
    icons: ["1", "24px"],
    disabledFill: ["1", true, true], disabledText: true, disabledHelper: "0.38",
    outlinedDisabledFill: "rgba(0, 0, 0, 0)",
  });

  await page.locator(".mtrl-textfield__input").first().focus();
  const focused = await read(`return style("filled", "input", "::placeholder").color === role("on-surface-variant");`);
  assert.equal(focused, true, "the placeholder shows while the field is focused");
  await page.locator(".mtrl-textfield__input").first().blur();

  await hover("filled");
  const filledHover = await read(`return [style("filled", "input").borderBottomColor === role("on-surface"), style("filled", "input").backgroundImage.startsWith("linear-gradient"), style("filled", "label").color === role("on-surface-variant")];`);
  assert.deepEqual(filledHover, [true, true, true], "filled hover: indicator on-surface, state layer, label unchanged");
  await hover("outlined");
  const outlinedHover = await read(`return style("outlined", "label").color === role("on-surface");`);
  assert.equal(outlinedHover, true, "outlined hover label is on-surface");
  await hover("error");
  const errorHover = await read(`return [style("error", "input").borderBottomColor, style("error", "label").color, style("error", ".mtrl-textfield__trailing-icon").color].every(c => c === role("on-error-container"));`);
  assert.equal(errorHover, true, "filled error hover is on-error-container");
  await hover("outlinedError");
  const outlinedErrorHover = await read(`return [style("outlinedError", "label").color, style("outlinedError", ".mtrl-textfield__trailing-icon").color].every(c => c === role("on-error-container"));`);
  assert.equal(outlinedErrorHover, true, "outlined error hover is on-error-container");
  await page.mouse.move(0, 0);

  await page.evaluate(() => Object.values((window as unknown as { probes: Record<string, Probe> }).probes).forEach(field => field.destroy()));
  console.log("Passed text field tokens: indicator, hover layer, caret, placeholder, outlined label, error roles, icons, disabled container and text.");
}

type AnatomyWindow = Window & {
  inputs: { createTextfield: typeof createTextfield };
  core: { createButton: (config: Record<string, unknown>) => { element: HTMLElement; destroy: () => void } };
  createSelect: (config: Record<string, unknown>) => { element: HTMLElement; open: () => unknown; destroy: () => void };
  anatomy: { destroy: () => void }[];
};

/**
 * The field and its supporting text row (FLO-300): the field stays 56px and
 * lines up with a button; only the row adds height, 4dp plus its lines; a
 * long helper wraps and pushes what follows; a select's menu opens against
 * the field, not under its helper.
 */
export async function checkTextfieldAnatomy(page: Page): Promise<void> {
  const measured = await page.evaluate(async () => {
    const w = window as unknown as AnatomyWindow;
    const stage = document.createElement("div");
    stage.style.cssText = "position:absolute;left:0;top:600px;width:600px";
    document.body.append(stage);
    const row = (...children: HTMLElement[]) => {
      const line = document.createElement("div");
      line.style.cssText = "display:flex;align-items:center;gap:8px;margin:0 0 24px";
      line.append(...children);
      stage.append(line);
      return line;
    };
    const plain = w.inputs.createTextfield({ label: "Name" });
    const button = w.core.createButton({ text: "Save", variant: "filled" });
    row(plain.element, button.element);
    const helped = w.inputs.createTextfield({ label: "Name", supportingText: "As on your passport", maxLength: 20 });
    row(helped.element);
    const wrapped = w.inputs.createTextfield({ label: "Name", supportingText: "A helper long enough that it has to wrap onto a second line under the field" });
    wrapped.element.style.width = "280px";
    stage.append(wrapped.element);
    const after = document.createElement("p");
    after.textContent = "After";
    after.style.margin = "0";
    stage.append(after);
    const select = w.createSelect({ label: "Pet", supportingText: "Pick one", options: [{ id: "cat", text: "Cat" }, { id: "dog", text: "Dog" }] });
    // Near the top, with room below, so the menu opens downwards.
    const top = document.createElement("div");
    top.style.cssText = "position:fixed;left:24px;top:24px";
    top.append(select.element);
    document.body.append(top);
    w.anatomy = [plain, button, helped, wrapped, select];
    const box = (el: Element) => el.getBoundingClientRect();
    const centre = (el: Element) => box(el).top + box(el).height / 2;
    const field = (el: HTMLElement) => el.querySelector(".mtrl-textfield__field") as HTMLElement;
    select.open();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const menu = document.querySelector(".mtrl-select__menu") as HTMLElement;
    return {
      plainHeight: box(plain.element).height,
      centred: Math.abs(centre(plain.element) - centre(button.element)) < 0.5,
      helpedField: box(field(helped.element)).height,
      helpedRow: box(helped.element).height - box(field(helped.element)).height,
      counterAtEnd: Math.abs(box(helped.element.querySelector(".mtrl-textfield__counter")!).right - (box(helped.element).right - 16)) < 0.5,
      wrappedRow: box(wrapped.element).height - 56,
      afterBelow: box(after).top >= box(wrapped.element).bottom - 0.5,
      menuGap: box(menu).top - box(field(select.element)).bottom,
      menuBelowHelper: box(menu).top >= box(select.element).bottom - 0.5,
    };
  });
  assert.equal(measured.plainHeight, 56, "a field without a helper is 56px");
  assert.equal(measured.centred, true, "it lines up with a button in a row");
  assert.equal(measured.helpedField, 56, "the helper row leaves the field at 56px");
  assert.equal(measured.helpedRow, 20, "the row adds 4dp and its 16dp line");
  assert.equal(measured.counterAtEnd, true, "the counter ends 16dp in from the field's end");
  assert.equal(measured.wrappedRow, 36, "a helper that wraps adds its second line");
  assert.equal(measured.afterBelow, true, "what follows sits below the wrapped helper");
  assert.ok(Math.abs(measured.menuGap) < 1, `the select's menu opens against the field, gap ${measured.menuGap}px`);
  assert.equal(measured.menuBelowHelper, false, "the menu does not drop below the helper row");
  await page.evaluate(() => (window as unknown as AnatomyWindow).anatomy.forEach((part) => part.destroy()));
  console.log("Passed text field anatomy: 56px field aligned with a button, the helper row adds only its lines and wraps, the counter at the end, the select's menu against the field.");
}

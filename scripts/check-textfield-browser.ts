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
    errorIndicator: [style("error", "input").borderBottomColor === role("error"), getComputedStyle(probes.error.element, "::before").opacity],
    icons: [style("error", ".mtrl-textfield__leading-icon").opacity, style("error", ".mtrl-textfield__leading-icon svg").width],
    disabledFill: [style("disabled", "input").opacity, style("disabled", "input").backgroundColor === role("on-surface", 0.04), style("disabled", "input").borderBottomColor === role("on-surface", 0.38)],
    disabledText: style("disabled", "input").color === role("on-surface", 0.38),
    disabledHelper: style("disabled", ".mtrl-textfield__helper").opacity,
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

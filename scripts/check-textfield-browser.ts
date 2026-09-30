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

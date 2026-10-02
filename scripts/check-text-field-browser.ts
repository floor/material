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
import type createTextField from "../src/components/text-field";

type FieldWindow = Window & {
  inputs: { createTextField: typeof createTextField };
  fields: { destroy: () => void }[];
};

export async function checkTextField(page: Page): Promise<void> {
  const measured = await page.evaluate(() => {
    const state = window as unknown as FieldWindow;
    const { createTextField } = state.inputs;
    const make = (variant: "filled" | "outlined") => {
      const field = createTextField({ label: "Name", variant });
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
      stillEmpty: filled.element.classList.contains("mtrl-text-field--empty") && outlined.element.classList.contains("mtrl-text-field--empty"),
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
export async function checkTextFieldTokens(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as unknown as FieldWindow & { probes: Record<string, Probe> };
    const { createTextField } = state.inputs;
    const icon = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
    const make = (config: Record<string, unknown>) => {
      const field = createTextField({ label: "Name", ...config } as never) as unknown as Probe;
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
  const hover = async (name: string) => page.locator(`.mtrl-text-field >> nth=${await page.evaluate((n) => [...document.querySelectorAll(".mtrl-text-field")].indexOf((window as unknown as { probes: Record<string, Probe> }).probes[n].element), name)}`).hover().then(() => page.waitForTimeout(400)); // past the colour transitions

  const rest = await read(`return {
    indicator: style("filled", "input").borderBottomColor === role("on-surface-variant"),
    caret: style("filled", "input").caretColor === role("primary"),
    placeholderUnderLabel: style("filled", "input", "::placeholder").color === "rgba(0, 0, 0, 0)",
    placeholderNoLabel: style("bare", "input", "::placeholder").color === role("on-surface-variant"),
    outlinedLabel: [style("outlined", "label").opacity, style("outlined", "label").color === role("on-surface-variant")],
    errorLeading: style("error", ".mtrl-text-field__leading-icon").color === role("on-surface-variant"),
    errorTrailing: style("error", ".mtrl-text-field__trailing-icon").color === role("error"),
    errorPrefix: style("error", ".mtrl-text-field__prefix").color === role("on-surface-variant"),
    errorCaret: style("error", "input").caretColor === role("error"),
    errorIndicator: [style("error", "input").borderBottomColor === role("error"), getComputedStyle(q("error", ".mtrl-text-field__field"), "::before").opacity],
    icons: [style("error", ".mtrl-text-field__leading-icon").opacity, style("error", ".mtrl-text-field__leading-icon svg").width],
    disabledFill: [style("disabled", "input").opacity, style("disabled", "input").backgroundColor === role("on-surface", 0.04), style("disabled", "input").borderBottomColor === role("on-surface", 0.38)],
    disabledText: style("disabled", "input").color === role("on-surface", 0.38),
    disabledHelper: style("disabled", ".mtrl-text-field__supporting").opacity,
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

  await page.locator(".mtrl-text-field__input").first().focus();
  const focused = await read(`return style("filled", "input", "::placeholder").color === role("on-surface-variant");`);
  assert.equal(focused, true, "the placeholder shows while the field is focused");
  await page.locator(".mtrl-text-field__input").first().blur();

  await hover("filled");
  const filledHover = await read(`return [style("filled", "input").borderBottomColor === role("on-surface"), style("filled", "input").backgroundImage.startsWith("linear-gradient"), style("filled", "label").color === role("on-surface-variant")];`);
  assert.deepEqual(filledHover, [true, true, true], "filled hover: indicator on-surface, state layer, label unchanged");
  await hover("outlined");
  const outlinedHover = await read(`return style("outlined", "label").color === role("on-surface");`);
  assert.equal(outlinedHover, true, "outlined hover label is on-surface");
  await hover("error");
  const errorHover = await read(`return [style("error", "input").borderBottomColor, style("error", "label").color, style("error", ".mtrl-text-field__trailing-icon").color].every(c => c === role("on-error-container"));`);
  assert.equal(errorHover, true, "filled error hover is on-error-container");
  await hover("outlinedError");
  const outlinedErrorHover = await read(`return [style("outlinedError", "label").color, style("outlinedError", ".mtrl-text-field__trailing-icon").color].every(c => c === role("on-error-container"));`);
  assert.equal(outlinedErrorHover, true, "outlined error hover is on-error-container");
  await page.mouse.move(0, 0);

  await page.evaluate(() => Object.values((window as unknown as { probes: Record<string, Probe> }).probes).forEach(field => field.destroy()));
  console.log("Passed text field tokens: indicator, hover layer, caret, placeholder, outlined label, error roles, icons, disabled container and text.");
}

type AnatomyWindow = Window & {
  inputs: { createTextField: typeof createTextField };
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
export async function checkTextFieldAnatomy(page: Page): Promise<void> {
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
    const plain = w.inputs.createTextField({ label: "Name" });
    const button = w.core.createButton({ text: "Save", variant: "filled" });
    row(plain.element, button.element);
    const helped = w.inputs.createTextField({ label: "Name", supportingText: "As on your passport", maxLength: 20 });
    row(helped.element);
    const wrapped = w.inputs.createTextField({ label: "Name", supportingText: "A helper long enough that it has to wrap onto a second line under the field" });
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
    const field = (el: HTMLElement) => el.querySelector(".mtrl-text-field__field") as HTMLElement;
    select.open();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const menu = document.querySelector(".mtrl-select__menu") as HTMLElement;
    return {
      plainHeight: box(plain.element).height,
      centred: Math.abs(centre(plain.element) - centre(button.element)) < 0.5,
      helpedField: box(field(helped.element)).height,
      helpedRow: box(helped.element).height - box(field(helped.element)).height,
      counterAtEnd: Math.abs(box(helped.element.querySelector(".mtrl-text-field__counter")!).right - (box(helped.element).right - 16)) < 0.5,
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

/**
 * While the label rests in the input area it is all that area shows (FLO-354,
 * FLO-355): in both variants, with and without a leading icon, enabled,
 * disabled, empty or with a value, no painted placeholder overlaps the label's
 * text, and the prefix and suffix show only once the label has floated. The
 * disabled input's -webkit-text-fill-color is inherited by the placeholder and
 * paints over its color, so the paint is read from the fill.
 */
export async function checkTextFieldPlaceholder(page: Page): Promise<void> {
  const cases = await page.evaluate(async () => {
    const { createTextField } = (window as unknown as FieldWindow).inputs;
    const icon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
    const rows: { name: string; painted: boolean; overlaps: boolean; affixes: number[] }[] = [];
    for (const variant of ["filled", "outlined"] as const) {
      for (const withIcon of [false, true]) {
        for (const disabled of [false, true]) {
          for (const value of ["", "Ada"]) {
            for (const focus of disabled ? [false] : [false, true]) {
              const field = createTextField({
                variant, label: "Name", placeholder: "Enter your name", supportingText: "Helper", disabled, value,
                prefixText: "$", suffixText: "USD",
                ...(withIcon ? { leadingIcon: icon } : {}),
              });
              field.element.style.width = "280px";
              document.body.append(field.element);
              const input = field.element.querySelector("input") as HTMLInputElement;
              const label = field.element.querySelector("label") as HTMLElement;
              if (focus) input.focus();
              await new Promise((resolve) => setTimeout(resolve, 300));
              const fill = getComputedStyle(input, "::placeholder").webkitTextFillColor;
              const painted = input.value === "" && !/^rgba\(0, 0, 0, 0\)$|transparent|\/ 0\)$/.test(fill);
              // The placeholder's em box, centred in the content box as the input centres its line
              const box = input.getBoundingClientRect();
              const s = getComputedStyle(input);
              const mid = (box.top + parseFloat(s.paddingTop) + box.bottom - parseFloat(s.paddingBottom)) / 2;
              const em = parseFloat(s.fontSize);
              const range = document.createRange();
              range.selectNodeContents(label);
              const text = range.getBoundingClientRect();
              const overlaps = text.top < mid + em / 2 && text.bottom > mid - em / 2
                && text.left < box.right - parseFloat(s.paddingRight) && text.right > box.left + parseFloat(s.paddingLeft);
              const affixes = [".mtrl-text-field__prefix", ".mtrl-text-field__suffix"]
                .map((selector) => Number(getComputedStyle(field.element.querySelector(selector) as HTMLElement).opacity));
              rows.push({ name: `${variant} icon=${withIcon} disabled=${disabled} value=${value !== ""} focused=${focus}`, painted, overlaps, affixes });
              field.destroy();
            }
          }
        }
      }
    }
    return rows;
  });
  assert.equal(cases.length, 24);
  for (const row of cases) {
    assert.ok(!(row.painted && row.overlaps), `${row.name}: the placeholder paints over the label`);
    // Resting: the affixes are hidden. Floated: they show, dimmed when disabled.
    if (row.overlaps) assert.deepEqual(row.affixes, [0, 0], `${row.name}: the prefix and suffix show beside the resting label`);
    else assert.ok(row.affixes.every((opacity) => opacity > 0.3), `${row.name}: the floated label's prefix and suffix are hidden (${row.affixes})`);
  }
  // The checks see both sides: a focused empty field shows its placeholder, a resting one does not.
  assert.ok(cases.some((row) => row.painted), "no case painted its placeholder");
  assert.ok(cases.some((row) => row.overlaps), "no case rested its label over the text");
  console.log("Passed text field resting label: 24 cases, filled and outlined, icon, disabled, value, focus — no placeholder, prefix or suffix beside the resting label; affixes once it floats.");
}

/**
 * The accessibility the text field draws (FLO-301), measured in the browser:
 * an interactive trailing icon is an icon button with a 48dp target and a 40dp
 * round state layer, after the input in the tab order, with a focus ring only
 * from the keyboard; decorative icons take no focus; and a required outlined
 * field's notch opens wide enough for the label and its asterisk.
 */
export async function checkTextFieldA11y(page: Page): Promise<void> {
  const icon = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8"/></svg>';
  const measured = await page.evaluate(async (icon) => {
    const { createTextField } = (window as unknown as FieldWindow).inputs;
    const host = document.createElement("div");
    host.style.cssText = "padding: 24px; width: 320px";
    document.body.append(host);
    const make = (config: Record<string, unknown>) => {
      const field = createTextField({ label: "Email", ...config } as never);
      host.append(field.element);
      return field;
    };
    const interactive = make({ variant: "outlined", trailingIcon: icon, trailingIconLabel: "Clear" });
    const decorative = make({ variant: "filled", leadingIcon: icon, trailingIcon: icon });
    const required = make({ variant: "outlined", required: true, value: "a@b.c" });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const button = interactive.trailingIcon as HTMLButtonElement;
    const box = button.getBoundingClientRect();
    const target = getComputedStyle(button, "::after");
    const iconBox = button.querySelector("svg")!.getBoundingClientRect();
    const field = interactive.field.getBoundingClientRect();

    const notch = required.element.querySelector<HTMLElement>(".mtrl-text-field__outline-notch")!;
    const label = required.element.querySelector("label")!;
    const asterisk = required.element.querySelector<HTMLElement>(".mtrl-text-field__required")!;

    const result = {
      tag: button.tagName,
      size: [Math.round(box.width), Math.round(box.height)],
      target: [parseFloat(target.width), parseFloat(target.height)],
      radius: getComputedStyle(button).borderRadius,
      // The icon keeps the decorative icon's centre: 16dp from the field's end
      iconFromEnd: Math.round(field.right - (iconBox.left + iconBox.width / 2)),
      decorativeFocusable: [decorative.leadingIcon, decorative.trailingIcon].map((el) => (el as HTMLElement).tabIndex >= 0),
      notchCoversLabel: notch.getBoundingClientRect().width >= label.getBoundingClientRect().width,
      asteriskInLabel: label.contains(asterisk) && getComputedStyle(asterisk).color === getComputedStyle(label).color,
    };
    return result;
  }, icon);

  assert.equal(measured.tag, "BUTTON");
  assert.deepEqual(measured.size, [40, 40], "the state layer is 40dp round the icon");
  assert.deepEqual(measured.target, [48, 48], "the target is 48dp");
  assert.equal(measured.radius, "50%");
  assert.equal(measured.iconFromEnd, 24, "the icon's centre stays 24dp from the field's end (12dp gap + 12dp half icon)");
  assert.deepEqual(measured.decorativeFocusable, [false, false], "decorative icons take no focus");
  assert.equal(measured.notchCoversLabel, true, "the notch opens round the label and its asterisk");
  assert.equal(measured.asteriskInLabel, true, "the asterisk is in the label, in its colour");

  // Tab: the input, then the button; a focus ring from the keyboard only
  const input = page.locator(".mtrl-text-field--outlined input").first();
  await input.focus();
  await page.keyboard.press("Tab");
  const keyboard = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement;
    return { isButton: active.matches(".mtrl-text-field__trailing-icon--button"), outline: getComputedStyle(active).outlineStyle };
  });
  assert.deepEqual(keyboard, { isButton: true, outline: "solid" }, "Tab reaches the trailing button, with a focus ring");
  const clicked = await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>(".mtrl-text-field__trailing-icon--button")!;
    button.blur();
    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    button.focus({ focusVisible: false } as FocusOptions);
    return getComputedStyle(button).outlineStyle;
  });
  assert.equal(clicked, "none", "no focus ring from a pointer");
  await page.evaluate(() => document.querySelectorAll(".mtrl-text-field").forEach((el) => el.closest("div")?.remove()));
  console.log("Passed text field accessibility: trailing icon button (40dp layer, 48dp target, tab order, keyboard focus ring), decorative icons unfocusable, the notch round the asterisk.");
}

/**
 * Placement set up late equals placement set up at creation (FLO-378). A plain
 * filled field installs no observers and measures nothing until a setter gives
 * it something to place; each of those setters must leave the field exactly as
 * a field created with that config: notch, input padding, label place and
 * scale, at rest and floated, and again after the window resizes.
 */
export async function checkTextFieldLatePlacement(page: Page): Promise<void> {
  const icon = '<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8"/></svg>';
  const cases: Array<[string, Record<string, unknown>, string]> = [
    ["outlined", { variant: "outlined" }, "setVariant"],
    ["prefix", { prefixText: "$" }, "setPrefixText"],
    ["suffix", { suffixText: "USD" }, "setSuffixText"],
    ["leading icon", { leadingIcon: icon }, "setLeadingIcon"],
    ["outlined prefix", { variant: "outlined", prefixText: "$" }, "setPrefixText"],
    ["outlined compact", { variant: "outlined", density: "compact" }, "setDensity"],
  ];
  const read = async () => page.evaluate(async ({ cases, icon }) => {
    const { createTextField } = (window as unknown as FieldWindow).inputs;
    const settle = () => new Promise((resolve) => setTimeout(resolve, 350));
    const host = document.createElement("div");
    host.id = "late";
    host.style.cssText = "padding: 24px; width: 320px";
    document.body.append(host);
    const shape = (field: { element: HTMLElement }) => {
      const input = field.element.querySelector("input") as HTMLInputElement;
      const label = field.element.querySelector("label") as HTMLElement;
      const notch = field.element.querySelector<HTMLElement>(".mtrl-text-field__outline-notch");
      const s = getComputedStyle(input);
      return {
        padding: [s.paddingLeft, s.paddingRight],
        label: [getComputedStyle(label).left, getComputedStyle(label).transform],
        notch: notch ? [Math.round(notch.getBoundingClientRect().width), field.element.querySelector(".mtrl-text-field__outline--notched") !== null] : null,
      };
    };
    const rows: Record<string, unknown> = {};
    for (const [name, config, setter] of cases) {
      const early = createTextField({ label: "Amount", ...config } as never);
      // Late: the same field built plain (outlined when only the setter under test is late), then changed
      const base = setter === "setVariant" ? {} : Object.fromEntries(Object.entries(config).filter(([key]) => key === "variant"));
      const late = createTextField({ label: "Amount", ...base } as never);
      host.append(early.element, late.element);
      await settle();
      const call: Record<string, () => void> = {
        setVariant: () => late.setVariant("outlined"),
        setPrefixText: () => late.setPrefixText("$"),
        setSuffixText: () => late.setSuffixText("USD"),
        setLeadingIcon: () => late.setLeadingIcon(icon),
        setDensity: () => late.setDensity("compact"),
      };
      call[setter]!();
      await settle();
      const rest = { early: shape(early), late: shape(late) };
      early.setValue("12");
      late.setValue("12");
      await settle();
      rows[name] = { rest, floated: { early: shape(early), late: shape(late) } };
    }
    return rows;
  }, { cases, icon });

  const compare = (rows: Record<string, { rest: { early: unknown; late: unknown }; floated: { early: unknown; late: unknown } }>, when: string) => {
    for (const [name, row] of Object.entries(rows)) {
      assert.deepEqual(row.rest.late, row.rest.early, `${name} (${when}), at rest: set late, the field is placed as one created with it`);
      assert.deepEqual(row.floated.late, row.floated.early, `${name} (${when}), floated`);
    }
  };
  const rows = await read() as never;
  compare(rows, "as created");
  // The window resizes: a late field's listener is there too
  await page.evaluate(() => document.getElementById("late")?.remove());
  const before = page.viewportSize();
  await page.setViewportSize({ width: 420, height: before?.height ?? 300 });
  const resized = await read() as never;
  compare(resized, "after a resize");
  await page.evaluate(() => document.getElementById("late")?.remove());
  if (before) await page.setViewportSize(before);
  console.log(`Passed text field late placement: ${cases.length} setters on a plain field place it as a field created with them, at rest and floated, and after a resize.`);
}

type LayoutBox = { start: number; end: number; top: number; bottom: number; width: number };
type LayoutRow = {
  name: string;
  textStart: number;
  textEnd: number;
  label: LayoutBox | null;
  leading: LayoutBox | null;
  trailing: LayoutBox | null;
  prefix: LayoutBox | null;
  suffix: LayoutBox | null;
};

/**
 * The text field's layout against the M3 measurements (FLO-299), rendered from
 * the packed CSS: filled and outlined, default and compact, left to right and
 * right to left, built by the factory or as `<m-text-field>`. Every distance is
 * from the container's start edge (its end edge for `…End`), so one expectation
 * covers both directions.
 *
 * Right to left is measured for the factory only: inside a shadow root the
 * filled rules' `[dir]` selectors do not match (FLO-562).
 */
export async function checkTextFieldLayout(page: Page, api: "factory" | "element"): Promise<void> {
  const rows = await page.evaluate(async (api) => {
    const icon = '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/></svg>';
    const cases: [string, Record<string, string>][] = [
      ["leading icon", { leadingIcon: icon }],
      ["leading icon, value", { leadingIcon: icon, value: "Ada" }],
      ["trailing icon, value", { trailingIcon: icon, value: "Ada" }],
      ["prefix, value", { prefixText: "$", value: "12" }],
      ["suffix, value", { suffixText: "kg", value: "12" }],
      ["leading icon, prefix, value", { leadingIcon: icon, prefixText: "$", value: "12" }],
      ["trailing icon, suffix, value", { trailingIcon: icon, suffixText: "kg", value: "12" }],
    ];
    const stage = document.createElement("div");
    document.body.append(stage);
    const mounted: { name: string; root: HTMLElement; rtl: boolean; destroy?: () => void }[] = [];
    for (const variant of ["filled", "outlined"]) for (const density of ["default", "compact"]) for (const dir of api === "factory" ? ["ltr", "rtl"] : ["ltr"]) {
      for (const [name, extra] of cases) {
        const cell = document.createElement("div");
        cell.dir = dir;
        cell.style.cssText = "width:280px;margin:0 0 8px";
        stage.append(cell);
        const config: Record<string, string> = { label: "Label", variant, density, ...extra };
        let root: HTMLElement;
        let destroy: (() => void) | undefined;
        if (api === "factory") {
          const field = (window as unknown as FieldWindow).inputs.createTextField(config as never);
          field.element.style.width = "280px";
          cell.append(field.element);
          root = field.element;
          destroy = () => field.destroy();
        } else {
          const host = document.createElement("m-text-field");
          for (const [key, value] of Object.entries(config)) host.setAttribute(key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), value);
          host.style.cssText = "display:inline-block;width:280px";
          cell.append(host);
          root = host.shadowRoot?.firstElementChild as HTMLElement;
        }
        mounted.push({ name: `${variant}, ${density}, ${dir}, ${name}`, root, rtl: dir === "rtl", destroy });
      }
    }
    // Past the label's float and the placement pass
    await new Promise((resolve) => setTimeout(resolve, 500));
    const px = (value: string) => parseFloat(value) || 0;
    const round = (value: number) => Math.round(value * 100) / 100;
    const rows = mounted.map(({ name, root, rtl }) => {
      const part = (suffix: string) => root.querySelector<HTMLElement>(`.mtrl-text-field__${suffix}`);
      const field = part("field")!.getBoundingClientRect();
      const box = (el: HTMLElement | null) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return {
          start: round(rtl ? field.right - b.right : b.left - field.left),
          end: round(rtl ? b.left - field.left : field.right - b.right),
          top: round(b.top - field.top),
          bottom: round(b.bottom - field.top),
          width: round(b.width),
        };
      };
      const input = part("input")!;
      const style = getComputedStyle(input);
      const inset = box(input)!;
      const [left, right] = [px(style.paddingLeft) + px(style.borderLeftWidth), px(style.paddingRight) + px(style.borderRightWidth)];
      return {
        name,
        textStart: round(inset.start + (rtl ? right : left)),
        textEnd: round(inset.end + (rtl ? left : right)),
        label: box(part("label")),
        leading: box(part("leading-icon")),
        trailing: box(part("trailing-icon")),
        prefix: box(part("prefix")),
        suffix: box(part("suffix")),
      };
    });
    mounted.forEach((field) => field.destroy?.());
    stage.remove();
    return rows;
  }, api) as LayoutRow[];

  const round = (value: number) => Math.round(value * 100) / 100;
  // Every failure is reported, not only the first
  const failures: string[] = [];
  const expect = (ok: boolean, message: string): void => { if (!ok) failures.push(message); };
  assert.equal(rows.length, api === "factory" ? 56 : 28);
  for (const row of rows) {
    const { name } = row;
    // An icon, then the prefix, then the text; mirrored at the end. The prefix
    // follows the leading icon box and the text the prefix (Compose
    // TextFieldImpl: `prefixPlaceable?.placeRelativeWithLayer(leadingPlaceable.widthOrZero, …)`,
    // `textHorizontalPosition = leadingPlaceable.widthOrZero + prefixPlaceable.widthOrZero`).
    // The text was sized from the affix alone, so beside an icon it began
    // under the icon, before the prefix.
    if (row.prefix) {
      if (row.leading) expect(row.prefix.start >= row.leading.start + row.leading.width, `${name}: the prefix starts after the leading icon (${row.prefix.start})`);
      const gap = round(row.textStart - (row.prefix.start + row.prefix.width));
      expect(gap >= 0 && gap <= 4, `${name}: the text starts after the prefix, ${gap}px from it`);
    }
    if (row.suffix) {
      if (row.trailing) expect(row.suffix.end >= row.trailing.end + row.trailing.width, `${name}: the suffix ends before the trailing icon (${row.suffix.end})`);
      const gap = round(row.textEnd - (row.suffix.end + row.suffix.width));
      expect(gap >= 0 && gap <= 4, `${name}: the text ends before the suffix, ${gap}px from it`);
    }
  }
  assert.deepEqual(failures, [], `${failures.length} of the layout assertions failed`);
  console.log(`Passed text field layout (${api}): ${rows.length} fields, filled and outlined, default and compact${api === "factory" ? ", left to right and right to left" : ""} — an icon, its affix, then the text.`);
}

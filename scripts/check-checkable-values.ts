// scripts/check-checkable-values.ts
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createCheckbox from "../src/components/checkbox";
import type createSwitch from "../src/components/switch";
import type { CheckboxElement, SwitchElement } from "../src/elements";

type Control = ReturnType<typeof createCheckbox> | ReturnType<typeof createSwitch>;
type Detail = { checked: boolean; value: boolean; valueAttribute: string; nativeEvent?: Event };
type Probe = { form: HTMLFormElement; input: HTMLInputElement; control: Control; host?: CheckboxElement | SwitchElement; events: unknown[]; native: Event[]; references: Event[] };
type ProbeWindow = Window & { inputs: { createCheckbox: typeof createCheckbox; createSwitch: typeof createSwitch }; checkableProbe: Probe };

/** Model values and form tokens remain distinct across activation, reset and disable. */
export async function checkCheckableValues(page: Page, surface: "factory" | "element"): Promise<void> {
  for (const kind of ["checkbox", "switch"] as const) {
    await page.evaluate(({ kind, surface }) => {
      const w = window as unknown as ProbeWindow;
      const form = document.createElement("form");
      form.id = "checkable-form";
      document.body.append(form);
      let host: CheckboxElement | SwitchElement | undefined;
      let control: Control;
      if (surface === "element") {
        host = document.createElement(kind === "checkbox" ? "m-checkbox" : "m-switch");
        host.setAttribute("name", "choice");
        host.setAttribute("value", "accepted");
        host.textContent = "checkable";
        form.append(host);
        control = host.component!;
      } else {
        control = w.inputs[kind === "checkbox" ? "createCheckbox" : "createSwitch"]({ name: "choice", value: "accepted", label: "checkable" });
        form.append(control.element);
      }
      const probe: Probe = { form, host, control, input: control.input, events: [], native: [], references: [] };
      w.checkableProbe = probe;
      control.input.id = "checkable-input";
      control.input.addEventListener("change", event => probe.native.push(event));
      const record = (detail: Detail, event?: CustomEvent): void => {
        probe.references.push(detail.nativeEvent!);
        probe.events.push({ value: detail.value, getter: control.getValue(), checked: host ? host.checked : control.isChecked(), valueAttribute: detail.valueAttribute, form: new FormData(form).get("choice"), native: detail.nativeEvent?.type, propagation: event ? event.bubbles && event.composed && event.target === host : true });
      };
      if (host) form.addEventListener("change", event => record((event as CustomEvent<Detail>).detail, event as CustomEvent));
      else {
        const emitter: { on(event: "change", handler: (payload: Detail) => void): unknown } = control;
        emitter.on("change", record);
      }
    }, { kind, surface });
    await page.locator("#checkable-input").click();
    await page.locator("#checkable-input").focus();
    await page.keyboard.press("Space");
    const changed = await page.evaluate(() => {
      const p = (window as unknown as ProbeWindow).checkableProbe;
      return { events: p.events, identity: p.references.length === p.native.length && p.references.every((event, index) => event === p.native[index]) };
    });
    assert.deepEqual(changed, { events: [true, false].map(value => ({ value, getter: value, checked: value, valueAttribute: "accepted", form: value ? "accepted" : null, native: "change", propagation: true })), identity: true }, `${surface} ${kind}: handler-time model, token, native identity and form synchronization`);
    const silent = await page.evaluate(() => {
      const p = (window as unknown as ProbeWindow).checkableProbe;
      if (p.host) { p.host.checked = true; p.host.setAttribute("value", "updated"); }
      else { p.control.setValue(true); p.control.setValueAttribute("updated"); }
      const token = new FormData(p.form).get("choice");
      p.form.reset();
      const reset = p.host ? p.host.checked : p.control.input.checked;
      if (p.host) p.host.setAttribute("disabled", ""); else p.control.disable();
      p.input.click();
      p.input.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
      return { token, reset, count: p.events.length, submitted: new FormData(p.form).get("choice") };
    });
    assert.deepEqual(silent, { token: "updated", reset: false, count: 2, submitted: null }, `${surface} ${kind}: silent setters, reset, disabled activation and form exclusion`);
    await page.evaluate(() => {
      const p = (window as unknown as ProbeWindow).checkableProbe;
      if (!p.host) p.control.destroy();
      p.form.remove();
    });
  }
  console.log(`  ok ${surface}: checkbox/switch boolean model values, string form tokens, native identity, click/Space, reset and disabled controls`);
}

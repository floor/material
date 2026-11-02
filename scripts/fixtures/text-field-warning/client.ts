import createTextField from "../../../dist/components/text-field/index.js";
import { textFieldElement } from "../../../dist/elements/text-field.js";
import { registerStyles } from "../../../dist/elements/styles.js";
import { warnDev } from "../../../dist/core/utils/warn.js";

registerStyles(Object.fromEntries(["ripple", "text-field"].map(name => [name, ""])));
textFieldElement.define();

export interface WarningRow { name: string; count: number; expected: number; messages: string[]; unchanged: boolean; tokens?: string[] }

const icon = "<svg></svg>";
let production = false;
try { production = process.env.NODE_ENV === "production"; } catch { /* Raw browser ESM. */ }
const run = (name: string, expected: number, scenario: () => boolean, tokens: string[] = ["trailingIconLabel", "trailing-icon-label"]): WarningRow => {
  const messages: string[] = [];
  const warn = console.warn;
  console.warn = (...args: unknown[]) => { messages.push(args.map(String).join(" ")); };
  let unchanged: boolean;
  try { unchanged = scenario(); } finally { console.warn = warn; }
  return { name, count: messages.length, expected: production ? 0 : expected, messages, unchanged, tokens };
};

const rows: WarningRow[] = [];
rows.push(run("shared helper without process", 0, () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, "process");
  Reflect.deleteProperty(window, "process");
  try { warnDev("probe", "a bundled warning without process"); }
  finally { if (descriptor) Object.defineProperty(window, "process", descriptor); }
  return true;
}));
for (const label of [undefined, "", "Reveal"]) {
  rows.push(run(`factory label ${JSON.stringify(label)}`, label ? 0 : 1, () => {
    const field = createTextField({ trailingIcon: icon, trailingIconLabel: label, value: "secret" });
    document.body.append(field.element);
    const before = field.trailingIcon;
    let activations = 0;
    const first = () => { activations++; };
    const second = () => { activations++; };
    const chain = field.on("trailing", first).on("trailing", second);
    field.trailingIcon!.click();
    const unchanged = chain === field && field.trailingIcon === before && field.getValue() === "secret"
      && (label ? before!.tagName === "BUTTON" && activations === 2 : before!.tagName === "SPAN" && before!.getAttribute("aria-hidden") === "true" && activations === 0);
    field.destroy(); field.element.remove();
    return unchanged;
  }));
}
rows.push(run("factory config listener", 1, () => {
  const field = createTextField({ trailingIcon: icon, onTrailingClick: () => {} });
  field.on("trailing", () => {});
  const ok = field.trailingIcon?.getAttribute("aria-hidden") === "true";
  field.destroy(); return ok;
}));
rows.push(run("factory decorative/no listener", 0, () => {
  const field = createTextField({ trailingIcon: icon });
  field.on("input", () => {});
  field.destroy(); return true;
}));
rows.push(run("factory without icon", 0, () => {
  const field = createTextField(); field.on("trailing", () => {}); field.destroy(); return true;
}));
rows.push(run("factory label set before listener", 0, () => {
  const field = createTextField({ trailingIcon: icon }); field.setTrailingIcon(icon, "Reveal");
  field.on("trailing", () => {}); field.destroy(); return true;
}));
for (const connected of [false, true]) for (const label of [undefined, "", "Reveal"]) {
  rows.push(run(`element ${connected ? "connected" : "before connect"} label ${JSON.stringify(label)}`, label ? 0 : 1, () => {
    const host = document.createElement("m-text-field");
    host.setAttribute("trailing-icon", icon);
    if (label !== undefined) host.setAttribute("trailing-icon-label", label);
    if (connected) document.body.append(host);
    let activations = 0;
    const first = () => { activations++; };
    const second = () => { activations++; };
    host.addEventListener("trailing", first);
    host.addEventListener("trailing", second);
    if (!connected) document.body.append(host);
    const before = host.component!.trailingIcon;
    before!.click();
    // A field rebuild and reconnect must not repeat its warning.
    host.setAttribute("label", "Password"); host.remove(); document.body.append(host);
    host.addEventListener("trailing", () => {});
    const unchanged = label ? before!.tagName === "BUTTON" && activations === 2 : before!.tagName === "SPAN" && before!.getAttribute("aria-hidden") === "true" && activations === 0;
    host.remove(); return unchanged;
  }));
}
rows.push(run("element decorative/no listener", 0, () => {
  const host = document.createElement("m-text-field"); host.setAttribute("trailing-icon", icon);
  document.body.append(host); host.addEventListener("input", () => {}); host.remove(); return true;
}));
rows.push(run("element null listener", 0, () => {
  const host = document.createElement("m-text-field"); host.setAttribute("trailing-icon", icon);
  document.body.append(host); (host as EventTarget).addEventListener("trailing", null); host.remove(); return true;
}));
rows.push(run("element and factory listeners share one warning", 1, () => {
  const host = document.createElement("m-text-field"); host.setAttribute("trailing-icon", icon); document.body.append(host);
  host.component!.on("trailing", () => {}); host.addEventListener("trailing", () => {}); host.remove(); return true;
}));
// Unknown config keys: named in development, ignored in every mode. The
// typo spelling is deliberately untyped; `maxLength` is the supported one.
rows.push(run("factory unknown config keys", 2, () => {
  const field = createTextField({ maxlength: 10, inputmode: "numeric" } as unknown as Parameters<typeof createTextField>[0]);
  document.body.append(field.element);
  const unchanged = field.input.getAttribute("maxlength") === null && field.input.maxLength === -1
    && field.input.getAttribute("inputmode") === null && field.input.inputMode === "";
  field.destroy(); field.element.remove();
  return unchanged;
}, ["unknown config key"]));
rows.push(run("factory supported keys quiet", 0, () => {
  const field = createTextField({ label: "l", value: "v", maxLength: 20, required: true, readonly: false,
    autocomplete: "off", pattern: ".*", placeholder: "p", name: "n", prefixText: "pre", suffixText: "suf",
    supportingText: "s", class: "c", id: "quiet", title: "t", style: {}, data: {}, tabIndex: 0,
    ariaLabel: "quiet", componentName: "text-field" } as unknown as Parameters<typeof createTextField>[0]);
  document.body.append(field.element);
  const unchanged = field.input.maxLength === 20;
  field.destroy(); field.element.remove();
  return unchanged;
}, ["unknown config key"]));
(window as unknown as { warningRows: WarningRow[] }).warningRows = rows;

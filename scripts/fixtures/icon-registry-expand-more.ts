import createSelect from "../../src/components/select";
import { createAssistChip, createFilterChip, createInputChip, createSuggestionChip, type ChipComponent, type ChipConfig } from "../../src/components/chips";
import { setIcons } from "../../src/core/icons";
import { clearGlobalDefaults, setComponentDefaults } from "../../src/core/config/global";
import { defineSelect } from "../../src/elements/select";
import { registerStyles } from "../../src/elements/styles";

export type ExpandMoreRegistryReport = { checks: { name: string; pass: boolean }[]; builtins: Record<string, string> };
const report: ExpandMoreRegistryReport = { checks: [], builtins: {} };
const check = (name: string, pass: boolean): void => { report.checks.push({ name, pass }); };
const icon = (name: string): string => `<svg aria-hidden="true" viewBox="0 0 24 24" data-glyph="${name}"><path d="M4 4h16v16H4z"/></svg>`;
const glyph = (root: ParentNode, selector: string): string => root.querySelector(selector)!.innerHTML;
const has = (html: string, name: string): boolean => html.includes(`data-glyph="${name}"`);
const mount = <C extends { element: HTMLElement }>(component: C): C => { document.body.append(component.element); return component; };

// The two admitted sites keep different drawings: the field's 24-grid triangle
// with its xmlns and spacer path, and the chip's aria-hidden triangle.
const FIELD = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M7 10l5 5 5-5H7z"></path></svg>';
const CHIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"></path></svg>';
const REMOVE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>';

const options = [{ id: "one", text: "One" }, { id: "two", text: "Two" }];
const field = () => mount(createSelect({ label: "Fruit", options }));
const menuChip = (config: ChipConfig = {}) => mount(createFilterChip({ label: "Price", trailingMenu: true, onTrailingClick() {}, ripple: false, ...config }));
const fieldGlyph = (component: ReturnType<typeof createSelect>): string => glyph(component.element, ".mtrl-text-field__trailing-icon");
const chipGlyph = (chip: ChipComponent): string => glyph(chip.element, ".mtrl-chip__trailing-action");
const elementFieldGlyph = (host: Element): string => glyph(host.shadowRoot!, ".mtrl-text-field__trailing-icon");

registerStyles(await (await fetch("/shadow.json")).json());
clearGlobalDefaults(); setIcons({ "expand-more": null });

const builtinField = field();
report.builtins.select = fieldGlyph(builtinField);
check("select: exact built-in field triangle", report.builtins.select === FIELD);
const builtinChip = menuChip();
report.builtins.chip = chipGlyph(builtinChip);
check("chip trailing menu: exact built-in triangle", report.builtins.chip === CHIP);

setIcons({ "expand-more": icon("first") });
const firstField = field(); const firstChip = menuChip();
check("select: registry override", has(fieldGlyph(firstField), "first"));
check("chip trailing menu: registry override", has(chipGlyph(firstChip), "first"));
const removeChip = mount(createInputChip({ label: "Ada", ripple: false }));
check("input chip: the remove glyph keeps its own role", glyph(removeChip.element, ".mtrl-chip__remove") === REMOVE);
const plainChips = [createAssistChip({ label: "Assist", ripple: false }), createSuggestionChip({ label: "Suggest", ripple: false })].map(mount);
for (const chip of plainChips) check(`${chip.getType()}: no trailing affordance added`, !chip.element.querySelector(".mtrl-chip__remove,.mtrl-chip__trailing-action"));

setIcons({ "expand-more": icon("later") });
check("select: creation-time capture", has(fieldGlyph(firstField), "first"));
check("chip: creation-time capture", has(chipGlyph(firstChip), "first"));
check("select: the next creation reads the new glyph", has(fieldGlyph(field()), "later"));
check("chip: the next creation reads the new glyph", has(chipGlyph(menuChip()), "later"));

setComponentDefaults("chip", { trailingIcon: icon("component") });
check("chip: component default wins over the registry", has(chipGlyph(menuChip()), "component"));
check("chip: instance wins over the component default", has(chipGlyph(menuChip({ trailingIcon: icon("instance") })), "instance"));
clearGlobalDefaults();
const setterChip = menuChip({ trailingIcon: icon("instance") });
setterChip.setTrailingIcon("");
check("chip: clearing restores the glyph captured at creation", has(chipGlyph(setterChip), "later"));

for (const clear of [null, undefined, ""] as const) {
  setIcons({ "expand-more": clear });
  check(`select: ${String(clear)} restores the built-in`, fieldGlyph(field()) === FIELD);
  check(`chip trailing menu: ${String(clear)} restores the built-in`, chipGlyph(menuChip()) === CHIP);
}

setIcons({ "expand-more": icon("warm") });
const warmField = field();
setIcons({ "expand-more": icon("during-open") });
warmField.open();
await new Promise(resolve => setTimeout(resolve, 60));
check("select: opening keeps the captured glyph", has(fieldGlyph(warmField), "warm"));
check("select: opening still sets expanded", warmField.element.querySelector("[aria-expanded='true']") !== null);
check("select: readonly select-only combobox", warmField.textField.input.getAttribute("role") === "combobox" && warmField.textField.input.readOnly);
check("select: styled geometry", warmField.element.getBoundingClientRect().height >= 40);
check("chip: trailing action keeps its menu contract", setterChip.trailingAction!.getAttribute("aria-haspopup") === "menu");

setIcons({ "expand-more": icon("element-first") });
defineSelect();
const hosts = document.createElement("section");
hosts.innerHTML = '<m-select label="Fruit" aria-label="Fruit"><m-select-option value="one">One</m-select-option><m-select-option value="two">Two</m-select-option></m-select>';
document.body.append(hosts);
await Promise.resolve();
const host = hosts.querySelector("m-select")!;
check("m-select: registry glyph at creation", has(elementFieldGlyph(host), "element-first"));
check("m-select: real shadow sheets", host.shadowRoot!.adoptedStyleSheets.length >= 3 && host.shadowRoot!.adoptedStyleSheets.some(sheet => sheet.cssRules.length > 5));
setIcons({ "expand-more": icon("element-next") });
check("m-select: existing instance keeps its glyph", has(elementFieldGlyph(host), "element-first"));
host.setAttribute("label", "Country");
await Promise.resolve();
check("m-select: recreation reads the new glyph", has(elementFieldGlyph(host), "element-next"));

setIcons({ "expand-more": null }); clearGlobalDefaults();
Reflect.set(window, "expandMoreRegistryReport", report);

import createDialog from "../../src/components/dialog";
import createFabMenu from "../../src/components/fab-menu";
import { createInputChip, createFilterChip, createAssistChip, createSuggestionChip } from "../../src/components/chips";
import { setIcons } from "../../src/core/icons";
import { clearGlobalDefaults, setComponentDefaults } from "../../src/core/config/global";
import { defineDialog } from "../../src/elements/dialog";
import { defineFabMenu } from "../../src/elements/fab-menu";
import { defineChips } from "../../src/elements/chips";
import { registerStyles } from "../../src/elements/styles";

export type CloseRegistryReport = { checks: { name: string; pass: boolean }[]; builtins: Record<string, string> };
const report: CloseRegistryReport = { checks: [], builtins: {} };
const check = (name: string, pass: boolean): void => { report.checks.push({ name, pass }); };
const icon = (name: string): string => `<svg aria-hidden="true" viewBox="0 0 24 24" data-glyph="${name}"><path d="M4 4h16v16H4z"/></svg>`;
const glyph = (root: ParentNode, selector: string): string => root.querySelector(selector)!.innerHTML;
const has = (html: string, name: string): boolean => html.includes(`data-glyph="${name}"`);
const mount = <C extends { element: HTMLElement }>(component: C): C => { document.body.append(component.element); return component; };
const items = [{ id: "one", text: "One" }, { id: "two", text: "Two" }];
const make = () => {
  const dialog = mount(createDialog({ title: "Dialog", closeButton: true, layer: "top" }));
  const fab = mount(createFabMenu({ icon: icon("open"), ariaLabel: "Actions", presentation: "list", items }));
  const input = mount(createInputChip({ label: "Ada" }));
  const filter = mount(createFilterChip({ label: "Red", onTrailingClick() {} }));
  return { dialog, fab, input, filter };
};
const read = (group: ReturnType<typeof make>): Record<string, string> => ({
  dialog: glyph(group.dialog.element, ".mtrl-dialog__header-close"),
  fab: glyph(group.fab.element, ".mtrl-fab-menu__close"),
  input: glyph(group.input.element, ".mtrl-chip__remove"),
  filter: glyph(group.filter.element, ".mtrl-chip__trailing-action"),
});
registerStyles(await (await fetch("/shadow.json")).json());
clearGlobalDefaults(); setIcons({ close: null });
const before = make();
report.builtins = read(before);
setIcons({ close: icon("first") });
const first = make();
for (const [site, html] of Object.entries(read(first))) check(`${site}: registry override`, has(html, "first"));
setIcons({ close: icon("later"), menu: icon("other-role") });
for (const [site, html] of Object.entries(read(first))) check(`${site}: creation-time capture`, has(html, "first"));
for (const [site, html] of Object.entries(read(before))) check(`${site}: prior built-in unchanged`, html === report.builtins[site]);
first.input.setTrailingIcon(icon("setter"));
check("chip: explicit setter wins", has(read(first).input, "setter"));
first.input.setTrailingIcon(""); first.filter.setTrailingIcon("");
check("input chip: clear restores captured glyph", has(read(first).input, "first"));
check("filter chip: clear restores captured glyph", has(read(first).filter, "first"));

setComponentDefaults("chip", { trailingIcon: icon("component") });
setComponentDefaults("fab-menu", { closeIcon: icon("component") });
const defaults = make();
check("chip: component default wins", has(read(defaults).input, "component"));
check("FAB menu: component default wins", has(read(defaults).fab, "component"));
const explicitChip = mount(createInputChip({ label: "Explicit", trailingIcon: icon("instance") }));
const explicitFab = mount(createFabMenu({ icon: icon("open"), ariaLabel: "Explicit actions", presentation: "list", items, closeIcon: icon("instance") }));
check("chip: instance wins", has(glyph(explicitChip.element, ".mtrl-chip__remove"), "instance"));
check("FAB menu: instance wins", has(glyph(explicitFab.element, ".mtrl-fab-menu__close"), "instance"));
clearGlobalDefaults();
const menuChip = mount(createFilterChip({ label: "Menu", trailingMenu: true, onTrailingClick() {} }));
check("chip menu triangle unchanged", glyph(menuChip.element, ".mtrl-chip__trailing-action").includes("M7 10l5 5 5-5z"));
for (const factory of [createAssistChip, createSuggestionChip]) {
  const chip = mount(factory({ label: "Plain" }));
  check(`${chip.getType()}: no close affordance added`, !chip.element.querySelector(".mtrl-chip__remove,.mtrl-chip__trailing-action"));
}
for (const clear of [null, undefined, ""] as const) {
  setIcons({ close: icon("clear-me") }); setIcons({ close: clear });
  const cleared = make();
  for (const [site, html] of Object.entries(read(cleared))) check(`${site}: ${String(clear)} restores built-in`, html === report.builtins[site]);
  for (const component of Object.values(cleared)) component.destroy();
}
setIcons({ close: icon("element-first") });
defineDialog(); defineFabMenu(); defineChips();
const hosts = document.createElement("section");
hosts.innerHTML = '<m-dialog close-button headline="Element dialog"></m-dialog><m-fab-menu presentation="list" aria-label="Element actions"><m-fab-menu-item>One</m-fab-menu-item><m-fab-menu-item>Two</m-fab-menu-item></m-fab-menu><m-chips><m-chip variant="input" value="ada">Ada</m-chip></m-chips>';
document.body.append(hosts);
await Promise.resolve();
const elementSites = [
  { tag: "m-dialog", selector: ".mtrl-dialog__header-close", attribute: "animation", value: "fade" },
  { tag: "m-fab-menu", selector: ".mtrl-fab-menu__close", attribute: "size", value: "large" },
  { tag: "m-chips", selector: ".mtrl-chip__remove", attribute: "selection", value: "single" },
];
setIcons({ close: icon("element-next") });
for (const { tag, selector, attribute, value } of elementSites) {
  const host = hosts.querySelector(tag)!;
  check(`${tag}: existing glyph stable`, has(glyph(host.shadowRoot!, selector), "element-first"));
  host.setAttribute(attribute, value); await Promise.resolve();
  check(`${tag}: recreation reads new glyph`, has(glyph(host.shadowRoot!, selector), "element-next"));
  const root = host.shadowRoot!;
  check(`${tag}: real shadow sheets`, root.adoptedStyleSheets.length >= 3 && root.adoptedStyleSheets.some(sheet => sheet.cssRules.length > 5));
}
setIcons({ close: icon("during-open") });
first.dialog.open(); await new Promise(resolve => setTimeout(resolve, 40));
check("dialog: opening keeps captured glyph", has(read(first).dialog, "first"));
check("dialog: native named close control", first.dialog.element.querySelector("[aria-label='Close dialog']")?.tagName === "BUTTON");
first.dialog.element.querySelector<HTMLButtonElement>(".mtrl-dialog__header-close")!.click();
check("dialog: close control still closes", !first.dialog.isOpen());
first.fab.open();
check("FAB menu: opening keeps captured glyph", has(read(first).fab, "first"));
check("FAB menu: expanded state", first.fab.fab.getAttribute("aria-expanded") === "true");
first.fab.fab.click();
check("FAB menu: activation closes", !first.fab.isOpen());
check("input chip: remove name preserved", first.input.element.querySelector(".mtrl-chip__remove")!.getAttribute("aria-label") === "Remove Ada");
check("filter chip: remove name preserved", first.filter.trailingAction!.getAttribute("aria-label") === "Remove Red");
check("chip: styled geometry", first.input.element.getBoundingClientRect().height >= 32);
setIcons({ close: null, menu: null }); clearGlobalDefaults();
Reflect.set(window, "closeRegistryReport", report);

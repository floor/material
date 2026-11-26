import assert from "node:assert/strict";
import type { ListComponent, ListConfig, ListItem, ListVariant } from "../../src/components/list/types";
import { CONFORMANCE_PROPERTIES, createConformanceHarness, type Case, type Part, type State } from "./measure";

type Selection = "single" | "multi" | "listbox";
type Fixture = {
  variant: ListVariant;
  direction: "ltr" | "rtl";
  selection: Selection;
  selected?: boolean;
  disabled?: boolean;
  lines?: 1 | 2 | 3;
  context?: "block" | "flex";
  leading?: "icon" | "avatar" | "image" | "video";
  trailing?: "icon" | "text" | "control";
  width?: number;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Fixture;
  const { variant, direction, selection, selected, disabled, context } = config;
  const lines = config.lines ?? 3;
  document.documentElement.dir = direction;
  host.style.width = `${config.width ?? 360}px`;
  host.style.display = context === "flex" ? "flex" : "block";
  const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const thumbnail = document.createElement("img");
  thumbnail.alt = "";
  thumbnail.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56'%3E%3Crect width='56' height='56' fill='purple'/%3E%3C/svg%3E";
  const video = document.createElement("video");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  const leadingType = config.leading ?? "icon";
  const trailingType = config.trailing ?? "icon";
  const first: ListItem = {
    id: "a", headline: "First", lines, selected, disabled,
    overline: lines === 3 ? "Overline" : undefined,
    supportingText: lines >= 2 ? "Description" : undefined,
    leading: selection === "listbox" ? undefined : { type: leadingType, content: { icon, avatar: "<span>A</span>", image: thumbnail, video }[leadingType] },
    trailing: { type: trailingType, content: { icon, text: "3 min", control: checkbox }[trailingType] },
  };
  const create = mtrl.createList as unknown as (config: ListConfig<ListItem>) => ListComponent<ListItem>;
  const list = create({
    variant, trackSelection: true, multiSelect: selection === "multi",
    initialSelection: selected ? ["a"] : [],
    items: [
      first, { id: "b", headline: "Second" }, { id: "c", headline: "Third" },
      { kind: "divider", inset: true }, { kind: "subheader", headline: "More" },
      { id: "d", headline: "Fourth" }, { id: "e", headline: "Last" },
    ],
  });
  if (selection === "listbox") {
    const enhance = mtrl.withSingleSelectListbox as unknown as (list: ListComponent<ListItem>) => ListComponent<ListItem>;
    enhance(list);
  }
  host.append(list.element);
  const firstRow = list.element.querySelector(".mtrl-list__item");
  if (!firstRow || firstRow.classList.contains("mtrl-list__item--disabled") !== !!disabled ||
      firstRow.classList.contains("mtrl-list__item--selected") !== !!selected) {
    throw new Error("List row did not mount in the requested state");
  }
};

const firstRow = ".mtrl-list__item:first-child";
const defaultAction = `${firstRow} .mtrl-list__action`;
const allParts: Part[] = [
  { name: "mount", selector: ":root" },
  { name: "list", selector: ".mtrl-list" },
  { name: "content", selector: ".mtrl-list__content" },
  { name: "row", selector: firstRow },
  { name: "second", selector: ".mtrl-list__item:nth-child(2)" },
  { name: "groupLast", selector: ".mtrl-list__item:nth-child(3)" },
  { name: "afterDivider", selector: ".mtrl-list__item:nth-child(6)" },
  { name: "last", selector: ".mtrl-list__item:last-child" },
  { name: "headline", selector: `${firstRow} .mtrl-list__headline` },
  { name: "supporting", selector: `${firstRow} .mtrl-list__supporting` },
  { name: "overline", selector: `${firstRow} .mtrl-list__overline` },
  { name: "text", selector: `${firstRow} .mtrl-list__text` },
  { name: "leading", selector: `${firstRow} .mtrl-list__leading` },
  { name: "leadingChild", selector: `${firstRow} .mtrl-list__leading > *` },
  { name: "radio", selector: `${firstRow} .mtrl-list__radio` },
  { name: "trailing", selector: `${firstRow} .mtrl-list__trailing` },
  { name: "divider", selector: ".mtrl-list__divider" },
  { name: "subheader", selector: ".mtrl-list__subheader" },
];

const cases: Case[] = [];
type PartSelection = { media?: boolean };
const add = (id: string, config: Fixture, state: State = "rest", scheme: "light" | "dark" = "light", density = 0, {media}: PartSelection = {}) => {
  const action = config.selection === "listbox" ? firstRow : defaultAction;
  const interaction: Partial<Record<State, string>> = { hover: ":hover", focus: ":focus-visible", pressed: ":active" };
  const check = interaction[state];
  cases.push({
    id, mount, config, state, scheme, density, focusTarget: state === "focus" ? action : undefined,
    properties: [...CONFORMANCE_PROPERTIES, "minWidth", "paddingInlineStart", "paddingInlineEnd",
      "marginInlineStart", "marginInlineEnd", "marginBlockStart", "marginBlockEnd", "alignItems", "direction", "fill", "webkitLineClamp"],
    parts: [
      { name: "action", selector: action },
      ...allParts,
      { name: "layer", selector: action, pseudo: "::before" },
      { name: "target", selector: action, pseudo: "::after" },
      ...(check ? [{ name: "interaction", selector: action + check }] : []),
      ...(media ? [{ name: "media", selector: `${firstRow} :is(img, video)` }] : []),
    ],
  });
};

for (const variant of ["standard","segmented"] as const) {
  const base: Fixture = { variant, direction: "ltr", selection: "single" };
  for (const scheme of ["light","dark"] as const) {
    for (const selected of [false,true]) {
      for (const state of ["rest","hover","focus","pressed","disabled"] as const) {
        add(`${variant}/${scheme}/${selected ? "selected" : "unselected"}/${state}`,
          { ...base, selected, disabled: state === "disabled" }, state, scheme);
      }
    }
    add(`${variant}/${scheme}/avatar`, {...base, leading:"avatar"}, "rest", scheme);
    add(`${variant}/${scheme}/metadata`, {...base, trailing:"text"}, "rest", scheme);
    add(`${variant}/${scheme}/metadata-selected`, {...base, trailing:"text", selected:true}, "rest", scheme);
    add(`${variant}/${scheme}/metadata-disabled-selected`, {...base, trailing:"text", selected:true, disabled:true}, "disabled", scheme);
  }
  for (const lines of [1,2,3] as const) {
    for (const density of [0,-1,-2,-3]) add(`${variant}/lines-${lines}/density-${density}`, {...base,lines}, "rest","light",density);
  }
  add(`${variant}/rtl`, {...base,direction:"rtl"});
  add(`${variant}/flex`, {...base,context:"flex",lines:1});
  add(`${variant}/block`, {...base,context:"block",lines:1,width:480});
  add(`${variant}/image`, {...base,leading:"image"}, "rest","light",0,{media:true});
  add(`${variant}/video`, {...base,leading:"video",lines:1}, "rest","light",0,{media:true});
  add(`${variant}/video-tall`, {...base,leading:"video"}, "rest","light",0,{media:true});
  add(`${variant}/listbox/focus`, {...base,selection:"listbox"}, "focus");
}

const engine = process.argv.includes("--webkit") ? "webkit" : "chromium";
const filter = process.argv.find(arg => arg.startsWith("--case="))?.slice(7);
const selectedCases = filter ? cases.filter(row => row.id.includes(filter)) : cases;
assert.ok(selectedCases.length, "No matching fixtures");
const harness = await createConformanceHarness({ component:"list",engine });
const errors: string[] = [];
harness.page.on("pageerror", error => errors.push(error.message));

try {
  const rows = await harness.measure(selectedCases);
  for (const row of rows) {
    for (const name of ["list","row","action","headline",row.id.includes("/listbox/") ? "radio" : "leading","trailing"]) {
      const part = row.parts[name];
      assert.ok(part && part.rect.width > 0 && part.rect.height > 0, `${row.id} missing ${name}`);
    }
    if (["hover","pressed","focus"].includes(row.state)) assert.ok(row.parts.interaction, `${row.id} did not reach ${row.state}`);
    if (row.id.endsWith("/image") || /\/video(-tall)?$/.test(row.id)) assert.ok(row.parts.media, `${row.id} missing media`);
  }

  const selectionResults = [];
  for (const variant of ["standard","segmented"] as const) {
    for (const selection of ["single","multi"] as const) {
      const { page } = harness;
      const config: Fixture = { variant, selection, direction:"ltr", trailing:"control" };
      await harness.measure([{ id:"before", mount, config, parts:[{name:"row",selector:firstRow}] }]);
      const pressed = () => page.locator(".mtrl-list__action").evaluateAll(elements => elements.slice(0, 3).map(el => el.getAttribute("aria-pressed")));
      const actions = page.locator(".mtrl-list__action");
      await actions.nth(0).click({position:{x:70,y:10}});
      assert.deepEqual(await pressed(),["true","false","false"]);
      assert.ok(await page.getByRole("checkbox",{name:"First"}).isChecked(), "Trailing control follows row");
      await actions.nth(1).press("Space");
      const two = await pressed();
      assert.deepEqual(two,[selection === "multi" ? "true" : "false","true","false"]);
      await actions.nth(1).press("Enter");
      const deselected = await pressed();
      assert.deepEqual(deselected,[selection === "multi" ? "true" : "false","false","false"]);
      selectionResults.push({variant,selection,two,deselected});
    }
  }

  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ source:harness.source, engine, rows, selectionResults }, null, 2));
} finally {
  await harness.close();
}

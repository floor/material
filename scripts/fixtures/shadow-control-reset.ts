/** Compare native controls across the shadow boundary with the same factory configuration. */
import { elements } from "../../dist/elements/index.js";
import type { ElementComponent } from "../../src/elements/define";

type Name = keyof typeof elements;
type Config = Record<string, unknown>;
type Host = HTMLElement & { component: ElementComponent | null };
type Spec = { name: string; attributes?: Config; create: (config: Config) => ElementComponent };
const ICON = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
const markup: Partial<Record<Name, string>> = {
  radios: '<m-radio value="a">One</m-radio><m-radio value="b">Two</m-radio>',
  tabs: '<m-tab value="a">One</m-tab><m-tab value="b">Two</m-tab>',
  navigationBar: `<m-navigation-bar-item value="a" icon='${ICON}'>One</m-navigation-bar-item><m-navigation-bar-item value="b" icon='${ICON}'>Two</m-navigation-bar-item>`,
  navigationRail: `<m-navigation-rail-item value="a" icon='${ICON}'>One</m-navigation-rail-item><m-navigation-rail-item value="b" icon='${ICON}'>Two</m-navigation-rail-item>`,
  drawer: `<m-drawer-item value="a" icon='${ICON}'>One</m-drawer-item><m-drawer-item value="b">Two</m-drawer-item>`,
  buttonGroup: `<m-button-group-item value="a" icon='${ICON}'>One</m-button-group-item><m-button-group-item value="b">Two</m-button-group-item>`,
  chips: '<m-chip variant="assist" value="a">Assist</m-chip><m-chip variant="filter" value="b">Filter</m-chip><m-chip variant="input" value="c">Input</m-chip><m-chip variant="suggestion" value="d">Suggestion</m-chip>',
  list: '<m-list-item value="a">One</m-list-item><m-list-item value="b" supporting-text="Support">Two</m-list-item>',
  carousel: '<m-carousel-item>One</m-carousel-item><m-carousel-item>Two</m-carousel-item>',
  menu: '<m-menu-item value="a">One</m-menu-item><m-menu-item value="b">Two</m-menu-item>',
  fabMenu: '<m-fab-menu-item value="a">One</m-fab-menu-item><m-fab-menu-item value="b">Two</m-fab-menu-item>',
  select: '<m-select-option value="a">One</m-select-option><m-select-option value="b">Two</m-select-option>',
  splitButton: '<m-menu-item value="a">One</m-menu-item><m-menu-item value="b">Two</m-menu-item>',
  search: '<m-search-suggestion value="a">One</m-search-suggestion>',
};
const variants: Array<{ name: Name; attributes: Record<string, string> }> = [
  { name: "textField", attributes: { type: "multiline" } },
  { name: "textField", attributes: { type: "search" } },
  { name: "datepicker", attributes: { variant: "modal" } },
  { name: "datepicker", attributes: { variant: "modal-input" } },
  { name: "datepicker", attributes: { variant: "fullscreen" } },
  { name: "timepicker", attributes: { type: "input", format: "24h", "show-seconds": "" } },
  { name: "navigationRail", attributes: { expanded: "" } },
  { name: "list", attributes: { variant: "segmented", selection: "multiple" } },
  { name: "fabMenu", attributes: { presentation: "menu" } },
  { name: "snackbar", attributes: { action: "Retry" } },
];
const properties = [
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant", "fontStretch", "lineHeight", "letterSpacing",
] as const;

const clone = (value: unknown): unknown => {
  if (value instanceof Node) return value.cloneNode(true);
  if (value instanceof Date) return new Date(value.valueOf());
  if (Array.isArray(value)) return value.map(clone);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]));
  }
  return value;
};
const controls = (root: HTMLElement): HTMLElement[] => [
  ...(root.matches("button,input,textarea,select") ? [root] : []),
  ...root.querySelectorAll<HTMLElement>("button,input,textarea,select"),
];
const read = (node: HTMLElement) => {
  const style = getComputedStyle(node);
  return Object.fromEntries(properties.map(property => [property, style[property]]));
};

/** Every element, including controls in closed surfaces; extra configurations expose other control types. */
export async function auditControlReset() {
  const fixtures = [
    ...(Object.keys(elements) as Name[]).map(name => ({ name, attributes: {} as Record<string, string> })),
    ...variants,
  ];
  const report = [];
  for (const { name, attributes } of fixtures) {
    const spec = elements[name].spec as unknown as Spec;
    const stage = document.createElement("section");
    // A consumer font with a different family, size, weight and line height
    // makes a surviving browser default distinguishable from inheritance.
    stage.style.cssText = 'font:500 19px/1.7 "Courier New",monospace;width:800px';
    const host = document.createElement(`m-${spec.name}`) as Host;
    host.innerHTML = markup[name] ?? "Control";
    for (const key of Object.keys(spec.attributes ?? {})) {
      if (["icon", "leading-icon", "trailing-icon"].includes(key)) host.setAttribute(key, ICON);
    }
    if (name === "textField" || name === "select") host.setAttribute("label", "Field");
    if (name === "search") { host.setAttribute("value", "query"); host.setAttribute("trailing-label", "Voice"); }
    if (name === "dialog") { host.setAttribute("headline", "Title"); host.setAttribute("close-button", ""); }
    if (name === "snackbar") host.setAttribute("dismissible", "");
    for (const [key, value] of Object.entries(attributes)) host.setAttribute(key, value);
    document.body.replaceChildren(stage);
    let config: Config | undefined;
    const create = spec.create;
    let twin: ElementComponent | undefined;
    try {
      // Observe the configuration without changing it. The light-DOM twin uses
      // the very factory the element wraps, with cloned node values so neither
      // path moves the other's content. Restore the spec before making the twin.
      spec.create = value => { config = value; return create(value); };
      try { stage.append(host); } finally { spec.create = create; }
      if (!host.component || !config) throw new Error(`${spec.name}: no component/configuration`);
      twin = create(clone(config) as Config);
      stage.append(twin.element);
      for (let i = 0; i < 2; i++) await new Promise(requestAnimationFrame);
      const shadow = controls(host.component.element);
      const light = controls(twin.element);
      const rows = shadow.map((node, index) => {
        const other = light[index];
        const element = read(node), factory = other ? read(other) : {};
        return {
          index, tag: node.localName, type: node.getAttribute("type"), className: node.className,
          factoryTag: other?.localName, factoryClass: other?.className,
          visible: node.getClientRects().length > 0,
          element, factory,
          differences: Object.fromEntries(properties.filter(property => element[property] !== factory[property])
            .map(property => [property, { element: element[property], factory: factory[property] }])),
        };
      });
      report.push({ element: spec.name, variant: JSON.stringify(attributes), elementCount: shadow.length, factoryCount: light.length, rows });
    } finally {
      spec.create = create;
      twin?.destroy();
      host.remove();
      stage.remove();
    }
  }
  return report;
}

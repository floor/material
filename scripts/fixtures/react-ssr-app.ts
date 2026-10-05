// scripts/fixtures/react-ssr-app.ts
import * as React from "react";
import { Button, Switch, Tabs, Tab, Card, Carousel, FabMenu, Toolbar, IconButton, configure } from "material/react";
configure({ prefix: "demo" });
const ICON = "<svg viewBox='0 0 24 24'><path d='M4 4h16v16H4z'/></svg>";
export const App = ({ mismatch = false }: { mismatch?: boolean }) => {
  const [checked, setChecked] = React.useState(true);
  const [clicks, setClicks] = React.useState(0);
  return React.createElement(React.Fragment, null,
    React.createElement(Carousel, { id: "fallback-0" }, React.createElement("span", null, "Light content")),
    React.createElement(FabMenu, { id: "fallback-1" }, React.createElement("span", null, "Light content")),
    React.createElement(Carousel, { id: "fallback-2" }, React.createElement("span", null, "Light content")),
    React.createElement("p", { id: "text" }, mismatch ? "Client mismatch" : "Server text"),
    React.createElement(Button, { id: "button", onClick: () => setClicks(n => n + 1), style: { marginTop: 4 }, className: "save", "aria-label": "Save" }, "Save"),
    React.createElement(Button, {
      id: "globals", label: "Globals", popover: "auto", inputMode: "numeric",
      enterKeyHint: "send", itemProp: "name", nonce: "abc",
    }),
    React.createElement("output", { id: "clicks" }, clicks),
    React.createElement(Switch, { id: "switch", checked, onChange: e => setChecked(e.detail.checked) }, "Wi-Fi"),
    React.createElement("output", { id: "checked" }, String(checked)),
    React.createElement(Tabs, { id: "tabs", value: "b" },
      React.createElement(Tab, { value: "a" }, "Flights"), React.createElement(Tab, { value: "b" }, "Trips")),
    React.createElement(Card, { id: "card", headline: "Nested" }, React.createElement(Button, { id: "nested" }, "Nested button")),
    // The shape toolbar: directly slotted selected icon buttons at two sizes
    // and one deeper in the overflow slot's content. The check reads their
    // computed radii on the no-JS page — the adapter's server markup carries
    // the marker, so the toolbar's pins apply before upgrade — and hydrates
    // them, where the server-only marker must not warn.
    React.createElement(Toolbar, { id: "shape-toolbar", "aria-label": "Shapes" },
      React.createElement(IconButton, { id: "shape-sel-s", toggle: true, selected: true, icon: ICON, "aria-label": "Selected s" }),
      React.createElement(IconButton, { id: "shape-sel-m", toggle: true, selected: true, size: "m", icon: ICON, "aria-label": "Selected m" }),
      React.createElement("div", { slot: "overflow" },
        React.createElement(IconButton, { id: "shape-overflow", toggle: true, selected: true, icon: ICON, "aria-label": "Overflow" }))),
  );
};

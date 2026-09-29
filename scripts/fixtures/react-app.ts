// The app scripts/check-react.ts renders on the server and hydrates in the
// browser, with React 18 and with React 19. Built against dist/react.
import * as React from "react";
import { Button, Checkbox, Switch, Tab, Tabs } from "../../dist/react/index.js";
import type { SwitchElement } from "../../dist/elements/index.js";

const h = React.createElement;
// JSX accepts data-* on any element; createElement with an object literal does not.
const dataTest = { "data-test": "1" } as React.HTMLAttributes<HTMLElement>;

type Log = Array<{ id: string; detail: unknown }>;
type Api = {
  log: Log;
  submits: number;
  setExtra: (v: boolean) => void;
  setOrder: (v: string[]) => void;
  setShow: (v: boolean) => void;
  switchRef: React.RefObject<SwitchElement | null>;
};

export const App = (): React.ReactElement => {
  const [controlled, setControlled] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);
  const [tab, setTab] = React.useState<string | null>("t2");
  const [extra, setExtra] = React.useState(false);
  const [order, setOrder] = React.useState(["a", "b"]);
  const [show, setShow] = React.useState(true);
  const switchRef = React.useRef<SwitchElement | null>(null);
  const api = React.useRef<Api | null>(null);

  React.useEffect(() => {
    const w = window as unknown as { api?: Api };
    api.current = w.api ?? { log: [], submits: 0, setExtra, setOrder, setShow, switchRef };
    w.api = api.current;
  }, []);
  const log = (id: string) => (event: CustomEvent<unknown>): void => {
    api.current?.log.push({ id, detail: event.detail });
  };

  return h(
    "main",
    null,
    h(
      "form",
      {
        id: "f",
        onSubmit: (e: React.FormEvent) => {
          e.preventDefault();
          if (api.current) api.current.submits++;
        },
      },
      h(Switch, { id: "u", name: "u", defaultChecked: true, onChange: log("u"), ref: switchRef }, "Uncontrolled"),
      h(Switch, { id: "c", checked: controlled, onChange: (e) => setControlled(e.detail.checked) }, "Controlled"),
      h(Switch, { id: "l", checked: false, onChange: log("l") }, "Locked"),
      h(Switch, { id: "d", disabled: true, supportingText: "Unavailable" }, "Disabled"),
      h(Button, { id: "b", type: "submit", variant: "filled", className: "save", ...dataTest }, "Save")
    ),
    h(
      Tabs,
      { id: "t", value: tab, onChange: (e) => setTab(e.detail.value) },
      h(Tab, { value: "t1" }, "Flights"),
      h(Tab, { value: "t2" }, "Trips"),
      extra ? h(Tab, { value: "t3" }, "Hotels") : null
    ),
    h("output", { id: "tab" }, tab),
    h("output", { id: "controlled" }, String(controlled)),
    h(Checkbox, { id: "cb", checked: agreed, onChange: (e) => setAgreed(e.detail.checked) }, "Agree"),
    h("output", { id: "agreed" }, String(agreed)),
    ...order.map((key) => h(Switch, { key, id: `o${key}` }, `Order ${key}`)),
    show ? h(Switch, { id: "gone" }, "Gone") : null,
    // Mounted in the browser after the element is defined: React 19 then
    // assigns same-named props to element properties.
    extra ? h(Switch, { id: "late", defaultChecked: true, disabled: true }, "Late") : null
  );
};

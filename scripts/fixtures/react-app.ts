// The app scripts/check-react.ts renders on the server and hydrates in the
// browser, with React 18 and with React 19. Built against dist/react.
import * as React from "react";
import { Button, Checkbox, Progress, Radio, Radios, Slider, Switch, Tab, Tabs, Textfield } from "../../dist/react/index.js";
import type { SwitchElement } from "../../dist/elements/index.js";
import { Chip, Chips } from "../../dist/react/index.js";

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
  setProgress: (v: number) => void;
  switchRef: React.RefObject<SwitchElement | null>;
};

export const App = (): React.ReactElement => {
  const [controlled, setControlled] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);
  const [level, setLevel] = React.useState(50);
  const [text, setText] = React.useState("");
  const [size, setSize] = React.useState<string | null>("m");
  const [diet, setDiet] = React.useState<string | string[] | null>(["veg"]);
  const [tab, setTab] = React.useState<string | null>("t2");
  const [extra, setExtra] = React.useState(false);
  const [order, setOrder] = React.useState(["a", "b"]);
  const [show, setShow] = React.useState(true);
  const [progress, setProgress] = React.useState(30);
  const switchRef = React.useRef<SwitchElement | null>(null);
  const api = React.useRef<Api | null>(null);

  React.useEffect(() => {
    const w = window as unknown as { api?: Api };
    api.current = w.api ?? { log: [], submits: 0, setExtra, setOrder, setShow, setProgress, switchRef };
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
    h(Progress, { id: "pg", value: progress, ariaLabel: "Uploading" }),
    h(Checkbox, { id: "cb", checked: agreed, onChange: (e) => setAgreed(e.detail.checked) }, "Agree"),
    h("output", { id: "agreed" }, String(agreed)),
    h(Slider, { id: "sl", ariaLabel: "Level", value: level, onChange: (e) => setLevel(e.detail.value) }),
    h("output", { id: "level" }, String(level)),
    h(Textfield, { id: "tf", label: "Name", value: text, onInput: (e) => setText(e.detail.value) }),
    h("output", { id: "text" }, text),
    h(
      Radios,
      { id: "rd", value: size, ariaLabel: "Size", onChange: (e) => setSize(e.detail.value) },
      h(Radio, { value: "s" }, "Small"),
      h(Radio, { value: "m" }, "Medium"),
      h(Radio, { value: "l" }, "Large")
    ),
    h("output", { id: "size" }, size),
    h(
      Chips,
      { id: "ck", ariaLabel: "Diet", value: diet, onChange: (e) => setDiet(e.detail.value) },
      h(Chip, { value: "veg" }, "Vegetarian"),
      h(Chip, { value: "gf" }, "Gluten free")
    ),
    h("output", { id: "diet" }, String(diet)),
    ...order.map((key) => h(Switch, { key, id: `o${key}` }, `Order ${key}`)),
    show ? h(Switch, { id: "gone" }, "Gone") : null,
    // Mounted in the browser after the element is defined: React 19 then
    // assigns same-named props to element properties.
    extra ? h(Switch, { id: "late", defaultChecked: true, disabled: true }, "Late") : null
  );
};

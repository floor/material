// The app scripts/check-solid.ts renders on the server and hydrates in the
// browser. Solid JSX, compiled by babel-preset-solid as a Solid app's build
// compiles it. Built against dist/solid.
import { createSignal, For, onMount, Show } from "solid-js";
import { Button, Checkbox, Progress, Radio, Radios, Slider, Switch, Tab, Tabs, Textfield } from "../../dist/solid/index.js";
import type { SwitchElement } from "../../dist/elements/index.js";

export const App = () => {
  const log: Array<{ id: string; detail: unknown }> = [];
  let submits = 0;
  const [controlled, setControlled] = createSignal(false);
  const [agreed, setAgreed] = createSignal(false);
  const [level, setLevel] = createSignal(50);
  const [text, setText] = createSignal("");
  const [size, setSize] = createSignal<string | null>("m");
  const [tab, setTab] = createSignal<string | null>("t2");
  const [extra, setExtra] = createSignal(false);
  const [order, setOrder] = createSignal(["a", "b"]);
  const [show, setShow] = createSignal(true);
  const [progress, setProgress] = createSignal(30);
  let switchRef: SwitchElement | undefined;
  const record = (id: string) => (event: CustomEvent<unknown>) => log.push({ id, detail: event.detail });

  onMount(() => {
    (window as unknown as { api: unknown }).api = {
      log,
      get submits() { return submits; },
      setControlled, setExtra, setOrder, setShow, setProgress,
      element: () => switchRef,
    };
  });

  return (
    <main>
      <form id="f" onSubmit={(e) => { e.preventDefault(); submits++; }}>
        <Switch id="u" name="u" defaultChecked onChange={record("u")} ref={switchRef}>Uncontrolled</Switch>
        <Switch id="c" checked={controlled()} onChange={(e) => setControlled(e.detail.checked)}>Controlled</Switch>
        <Switch id="d" disabled supportingText="Unavailable">Disabled</Switch>
        <Button id="b" type="submit" variant="filled" class="save" data-test="1">Save</Button>
      </form>
      <Tabs id="t" value={tab()} onChange={(e) => setTab(e.detail.value)}>
        <Tab value="t1">Flights</Tab>
        <Tab value="t2">Trips</Tab>
        <Show when={extra()}><Tab value="t3">Hotels</Tab></Show>
      </Tabs>
      <output id="tab">{String(tab())}</output>
      <output id="controlled">{String(controlled())}</output>
      <Progress id="pg" value={progress()} ariaLabel="Uploading" />
      <Checkbox id="cb" checked={agreed()} onChange={(e) => setAgreed(e.detail.checked)}>Agree</Checkbox>
      <output id="agreed">{String(agreed())}</output>
      <Slider id="sl" ariaLabel="Level" value={level()} onChange={(e) => setLevel(e.detail.value)} />
      <output id="level">{String(level())}</output>
      <Textfield id="tf" label="Name" value={text()} onInput={(e) => setText(e.detail.value)} />
      <output id="text">{text()}</output>
      <Radios id="rd" ariaLabel="Size" value={size()} onChange={(e) => setSize(e.detail.value)}>
        <Radio value="s">Small</Radio>
        <Radio value="m">Medium</Radio>
        <Radio value="l">Large</Radio>
      </Radios>
      <output id="size">{String(size())}</output>
      <For each={order()}>{(key) => <Switch id={`o${key}`}>Order {key}</Switch>}</For>
      <Show when={show()}><Switch id="gone">Gone</Switch></Show>
      {/* Mounted in the browser after the element is defined: Solid writes a
          key the element has as a property. */}
      <Show when={extra()}><Switch id="late" defaultChecked disabled>Late</Switch></Show>
    </main>
  );
};

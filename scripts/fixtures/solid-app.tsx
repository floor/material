// The app scripts/check-solid.ts renders on the server and hydrates in the
// browser. Solid JSX, compiled by babel-preset-solid as a Solid app's build
// compiles it. Built against dist/solid.
import { createSignal, For, onMount, Show } from "solid-js";
import {
  Button, Checkbox, List, ListItem, NavigationRail, NavigationRailItem, Progress, Radio, Radios, Slider, Switch, Tab, Tabs,
  TextField,
} from "../../dist/solid/index.js";
import type { SwitchElement } from "../../dist/elements/index.js";
import { Chip, Chips } from "../../dist/solid/index.js";
import { Select, SelectOption } from "../../dist/solid/index.js";
import { Dialog } from "../../dist/solid/index.js";
import { Datepicker } from "../../dist/solid/index.js";
import { Search, SearchSuggestion } from "../../dist/solid/index.js";

const ICON = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
// The suggestions a search offers, filtered by the query as the user types.
const FRUITS = ["Apple", "Apricot", "Banana"];

export const App = () => {
  const log: Array<{ id: string; detail: unknown }> = [];
  let submits = 0;
  const [controlled, setControlled] = createSignal(false);
  const [agreed, setAgreed] = createSignal(false);
  const [level, setLevel] = createSignal(50);
  const [text, setText] = createSignal("");
  const [size, setSize] = createSignal<string | null>("m");
  const [diet, setDiet] = createSignal<string | string[] | null>(["veg"]);
  const [tab, setTab] = createSignal<string | null>("t2");
  const [destination, setDestination] = createSignal<string | null>("inbox");
  const [extra, setExtra] = createSignal(false);
  const [order, setOrder] = createSignal(["a", "b"]);
  const [show, setShow] = createSignal(true);
  const [progress, setProgress] = createSignal(30);
  const [fruit, setFruit] = createSignal<string | null>("b");
  const [pet, setPet] = createSignal<string | null>("cat");
  const [dialog, setDialog] = createSignal(false);
  const [dialogText, setDialogText] = createSignal("Your changes will be lost.");
  const [rail, setRail] = createSignal(false);
  const [due, setDue] = createSignal("2026-09-10");
  const [query, setQuery] = createSignal("ap");
  let switchRef: SwitchElement | undefined;
  const record = (id: string) => (event: CustomEvent<unknown>) => log.push({ id, detail: event.detail });

  onMount(() => {
    (window as unknown as { api: unknown }).api = {
      log,
      get submits() { return submits; },
      setControlled, setExtra, setOrder, setShow, setProgress, setDialog, setRail, setDialogText,
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
      <TextField id="tf" label="Name" value={text()} onInput={(e) => setText(e.detail.value)} />
      <output id="text">{text()}</output>
      <Radios id="rd" ariaLabel="Size" value={size()} onChange={(e) => setSize(e.detail.value)}>
        <Radio value="s">Small</Radio>
        <Radio value="m">Medium</Radio>
        <Radio value="l">Large</Radio>
      </Radios>
      <output id="size">{String(size())}</output>
      <NavigationRail id="nr" ariaLabel="Main" value={destination()} onChange={(e) => setDestination(e.detail.value)}>
        <NavigationRailItem value="inbox" icon={ICON}>Inbox</NavigationRailItem>
        <NavigationRailItem value="sent" icon={ICON}>Sent</NavigationRailItem>
        <NavigationRailItem value="starred" icon={ICON}>Starred</NavigationRailItem>
      </NavigationRail>
      <output id="destination">{String(destination())}</output>
      <Chips id="ck" ariaLabel="Diet" value={diet()} onChange={(e) => setDiet(e.detail.value)}>
        <Chip value="veg">Vegetarian</Chip>
        <Chip value="gf">Gluten free</Chip>
      </Chips>
      <output id="diet">{String(diet())}</output>
      <List id="li" ariaLabel="Fruits" value={fruit()} onChange={(e) => setFruit(e.detail.value)}>
        <ListItem value="a">Apple</ListItem>
        <ListItem value="b">Banana</ListItem>
        <ListItem value="c">Cherry</ListItem>
      </List>
      <output id="fruit">{String(fruit())}</output>
      <Select id="se" label="Pet" value={pet()} onChange={(e) => setPet(e.detail.value)}>
        <SelectOption value="cat">Cat</SelectOption>
        <SelectOption value="dog">Dog</SelectOption>
      </Select>
      <output id="pet">{String(pet())}</output>
      {/* Controlled: Escape closes the dialog, and onClose puts the state in step */}
      {/* Named slots as props (FLO-333): JSX for the headline, a component in actions */}
      <Dialog id="dg" open={dialog()} onClose={() => setDialog(false)}
        headline={<strong>Discard draft?</strong>} actions={<Button id="dga">Discard</Button>}>
        {dialogText()}
      </Dialog>
      <output id="dialog">{String(dialog())}</output>
      {/* Controlled: expanded is state; Escape collapses the modal rail, and onCollapse puts the state in step */}
      <NavigationRail id="mr" layout="modal" ariaLabel="Modal rail" expanded={rail()}
        onExpand={() => setRail(true)} onCollapse={() => setRail(false)}>
        <NavigationRailItem value="inbox" icon={ICON}>Inbox</NavigationRailItem>
        <NavigationRailItem value="sent" icon={ICON}>Sent</NavigationRailItem>
      </NavigationRail>
      <output id="rail">{String(rail())}</output>
      <Datepicker id="dt" variant="modal" label="Due" value={due()} onChange={(e) => setDue(e.detail.value)} />
      <output id="due">{due()}</output>
      {/* Controlled, its suggestions replaced as the query changes */}
      <Search id="sq" ariaLabel="Query" value={query()} onInput={(e) => setQuery(e.detail.value)} onSelect={(e) => setQuery(e.detail.value)}>
        <For each={FRUITS.filter((f) => f.toLowerCase().includes(query().toLowerCase()))}>
          {(f) => <SearchSuggestion value={f.toLowerCase()}>{f}</SearchSuggestion>}
        </For>
      </Search>
      <output id="query">{query()}</output>
      <For each={order()}>{(key) => <Switch id={`o${key}`}>Order {key}</Switch>}</For>
      <Show when={show()}><Switch id="gone">Gone</Switch></Show>
      {/* Mounted in the browser after the element is defined: Solid writes a
          key the element has as a property. */}
      <Show when={extra()}><Switch id="late" defaultChecked disabled>Late</Switch></Show>
    </main>
  );
};

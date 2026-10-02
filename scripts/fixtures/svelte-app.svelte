<!-- The app scripts/check-svelte.ts renders on the server and hydrates in the
     browser. Built against dist/svelte. -->
<script lang="ts">
  import { onMount } from "svelte";
  import {
    Button, Checkbox, Chip, Chips, List, ListItem, NavigationRail, NavigationRailItem, Progress, Radio, Radios, Slider,
    Switch, Tab, Tabs, TextField,
  } from "../../dist/svelte/index.js";
  import { Select, SelectOption } from "../../dist/svelte/index.js";
  import { Dialog } from "../../dist/svelte/index.js";
  import { Datepicker } from "../../dist/svelte/index.js";
  import { Search, SearchSuggestion } from "../../dist/svelte/index.js";

  const ICON = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  // The suggestions a search offers, filtered by the query as the user types.
  const FRUITS = ["Apple", "Apricot", "Banana"];

  type Log = Array<{ id: string; detail: unknown }>;
  const log: Log = [];
  const modelLog: Array<{ id: string; detail: unknown; host: unknown }> = [];
  let submits = 0;
  let bound = $state(false);
  let agreed = $state(false);
  let level = $state(50);
  let text = $state("");
  let size = $state<string | null>("m");
  let diet = $state<string | string[] | null>(["veg"]);
  let tab = $state<string | null>("t2");
  let destination = $state<string | null>("inbox");
  let extra = $state(false);
  let order = $state(["a", "b"]);
  let show = $state(true);
  let progress = $state(30);
  let fruit = $state<string | null>("b");
  let pet = $state<string | null>("cat");
  let dialog = $state(false);
  let rail = $state(false);
  let due = $state("2026-09-10");
  let query = $state("ap");
  let ref = $state<{ readonly element: HTMLElement | null } | undefined>();
  // Callbacks that are not snippets: never called by rendering (FLO-334)
  let renderCalls = 0;
  const callbacks = { onFoo: () => void renderCalls++ };

  const record = (id: string) => (event: CustomEvent<unknown>) => log.push({ id, detail: event.detail });
  const recordModel = (id: string, event: CustomEvent<{ value: unknown }>, field: "value" | "checked" = "value") => {
    const host = event.target as HTMLElement & { value: unknown; checked: boolean };
    modelLog.push({ id, detail: structuredClone(event.detail.value), host: structuredClone(host[field]) });
  };

  onMount(() => {
    (window as unknown as { api: unknown }).api = {
      log,
      modelLog,
      get submits() { return submits; },
      setBound: (v: boolean) => (bound = v),
      setExtra: (v: boolean) => (extra = v),
      setOrder: (v: string[]) => (order = v),
      setShow: (v: boolean) => (show = v),
      setProgress: (v: number) => (progress = v),
      setDialog: (v: boolean) => (dialog = v),
      setRail: (v: boolean) => (rail = v),
      get ref() { return ref?.element ?? null; },
      get renderCalls() { return renderCalls; },
    };
  });
</script>

<main>
  <form id="f" onsubmit={(e) => { e.preventDefault(); submits++; }}>
    <Switch id="u" name="u" defaultChecked onchange={(e) => { record("u")(e); recordModel("boolean", e, "checked"); }}>Uncontrolled</Switch>
    <Switch id="m" bind:checked={bound}>Bound</Switch>
    <Switch id="d" disabled supportingText="Unavailable">Disabled</Switch>
    <Button id="b" type="submit" variant="filled" class="save" data-test="1">Save</Button>
  </form>
  <Tabs id="t" bind:value={tab}>
    <Tab value="t1">Flights</Tab>
    <Tab value="t2">Trips</Tab>
    {#if extra}<Tab value="t3">Hotels</Tab>{/if}
  </Tabs>
  <output id="tab">{String(tab)}</output>
  <output id="bound">{String(bound)}</output>
  <Progress id="pg" value={progress} ariaLabel="Uploading" />
  <Checkbox id="cb" bind:checked={agreed}>Agree</Checkbox>
  <output id="agreed">{String(agreed)}</output>
  <Slider id="sl" ariaLabel="Level" bind:value={level} />
  <output id="level">{String(level)}</output>
  <TextField id="tf" label="Name" bind:value={text} oninput={(e) => recordModel("string", e)} />
  <output id="text">{text}</output>
  <Radios id="rd" ariaLabel="Size" bind:value={size}>
    <Radio value="s">Small</Radio>
    <Radio value="m">Medium</Radio>
    <Radio value="l">Large</Radio>
  </Radios>
  <output id="size">{String(size)}</output>
  <NavigationRail id="nr" ariaLabel="Main" bind:value={destination}>
    <NavigationRailItem value="inbox" icon={ICON}>Inbox</NavigationRailItem>
    <NavigationRailItem value="sent" icon={ICON}>Sent</NavigationRailItem>
    <NavigationRailItem value="starred" icon={ICON}>Starred</NavigationRailItem>
  </NavigationRail>
  <output id="destination">{String(destination)}</output>
  <Chips id="ck" ariaLabel="Diet" bind:value={diet} onchange={(e) => recordModel("array", e)}>
    <Chip value="veg">Vegetarian</Chip>
    <Chip value="gf">Gluten free</Chip>
  </Chips>
  <output id="diet">{String(diet)}</output>
  <List id="li" ariaLabel="Fruits" bind:value={fruit}>
    <ListItem value="a">Apple</ListItem>
    <ListItem value="b">Banana</ListItem>
    <ListItem value="c">Cherry</ListItem>
  </List>
  <output id="fruit">{String(fruit)}</output>
  <Select id="se" label="Pet" bind:value={pet}>
    <SelectOption value="cat">Cat</SelectOption>
    <SelectOption value="dog">Dog</SelectOption>
  </Select>
  <output id="pet">{String(pet)}</output>
  <!-- Controlled: Escape closes the dialog, and onclose puts the state in step -->
  <!-- Named snippets are the named slots (FLO-325) -->
  <Dialog id="dg" open={dialog} onclose={() => (dialog = false)}>
    {#snippet headline()}Discard draft?{/snippet}
    {#snippet actions()}<Button id="dga">Discard</Button>{/snippet}
    Your changes will be lost.
  </Dialog>
  <output id="dialog">{String(dialog)}</output>
  <!-- Controlled: expanded is state; Escape collapses the modal rail, and oncollapse puts the state in step -->
  <NavigationRail id="mr" layout="modal" ariaLabel="Modal rail" expanded={rail}
    onexpand={() => (rail = true)} oncollapse={() => (rail = false)}>
    <NavigationRailItem value="inbox" icon={ICON}>Inbox</NavigationRailItem>
    <NavigationRailItem value="sent" icon={ICON}>Sent</NavigationRailItem>
  </NavigationRail>
  <output id="rail">{String(rail)}</output>
  <Datepicker id="dt" variant="modal" label="Due" bind:value={due} />
  <output id="due">{due}</output>
  <!-- Bound, its suggestions replaced as the query changes -->
  <Search id="sq" ariaLabel="Query" bind:value={query}>
    {#each FRUITS.filter((f) => f.toLowerCase().includes(query.toLowerCase())) as f (f)}
      <SearchSuggestion value={f.toLowerCase()}>{f}</SearchSuggestion>
    {/each}
  </Search>
  <output id="query">{query}</output>
  <!-- A camelCase handler and a spread callback are not snippets (FLO-334) -->
  <Button id="cbk" onClick={() => void renderCalls++} {...callbacks}>Callbacks</Button>
  <!-- bind:this reads the element; an attachment reaches it (FLO-325) -->
  <Switch id="bt" bind:this={ref}>Ref</Switch>
  <Switch id="at" {@attach (node: HTMLElement) => { node.dataset.attached = "yes"; }}>Attached</Switch>
  {#each order as key (key)}<Switch id={`o${key}`}>Order {key}</Switch>{/each}
  {#if show}<Switch id="gone">Gone</Switch>{/if}
  <!-- Mounted in the browser after the element is defined: Svelte writes a
       key the element has as a property. -->
  {#if extra}<Switch id="late" defaultChecked disabled>Late</Switch>{/if}
</main>

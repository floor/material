<!-- The app scripts/check-svelte.ts renders on the server and hydrates in the
     browser. Built against dist/svelte. -->
<script lang="ts">
  import { onMount } from "svelte";
  import {
    Button, Checkbox, NavigationRail, NavigationRailItem, Progress, Radio, Radios, Slider, Switch, Tab, Tabs, Textfield,
  } from "../../dist/svelte/index.js";

  const ICON = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';

  type Log = Array<{ id: string; detail: unknown }>;
  const log: Log = [];
  let submits = 0;
  let bound = $state(false);
  let agreed = $state(false);
  let level = $state(50);
  let text = $state("");
  let size = $state<string | null>("m");
  let tab = $state<string | null>("t2");
  let destination = $state<string | null>("inbox");
  let extra = $state(false);
  let order = $state(["a", "b"]);
  let show = $state(true);
  let progress = $state(30);

  const record = (id: string) => (event: CustomEvent<unknown>) => log.push({ id, detail: event.detail });

  onMount(() => {
    (window as unknown as { api: unknown }).api = {
      log,
      get submits() { return submits; },
      setBound: (v: boolean) => (bound = v),
      setExtra: (v: boolean) => (extra = v),
      setOrder: (v: string[]) => (order = v),
      setShow: (v: boolean) => (show = v),
      setProgress: (v: number) => (progress = v),
    };
  });
</script>

<main>
  <form id="f" onsubmit={(e) => { e.preventDefault(); submits++; }}>
    <Switch id="u" name="u" defaultChecked onchange={record("u")}>Uncontrolled</Switch>
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
  <Textfield id="tf" label="Name" bind:value={text} />
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
  {#each order as key (key)}<Switch id={`o${key}`}>Order {key}</Switch>{/each}
  {#if show}<Switch id="gone">Gone</Switch>{/if}
  <!-- Mounted in the browser after the element is defined: Svelte writes a
       key the element has as a property. -->
  {#if extra}<Switch id="late" defaultChecked disabled>Late</Switch>{/if}
</main>

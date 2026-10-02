// scripts/fixtures/solid-ssr-async.tsx
/** @jsxImportSource solid-js */
// The review's Suspense shapes. Shared by the server and development hydration build.
import { createContext, createResource, Suspense, useContext, type Accessor } from "solid-js";
import { Button, Card } from "material/solid";

export const counts = { fetches: 0, children: 0 };
const Context = createContext("missing context");
const load = async (): Promise<string> => {
  counts.fetches++;
  await new Promise((resolve) => setTimeout(resolve, 20));
  return "loaded";
};
const Read = (props: { data: Accessor<string | undefined> }) => {
  counts.children++;
  return <i>{useContext(Context)} {props.data()}</i>;
};
const Slow = () => {
  const [data] = createResource(load);
  return <Read data={data} />;
};
const scenarios = {
  A: () => <Suspense fallback={<em>pending</em>}><Button id="async-host"><Slow /></Button></Suspense>,
  B: () => <Card id="async-host"><Suspense fallback={<em>pending</em>}><Slow /></Suspense></Card>,
  C: () => {
    const [data] = createResource(load);
    return <Suspense fallback={<em>pending</em>}><Button id="async-host"><Read data={data} /></Button></Suspense>;
  },
  D: () => {
    const [data] = createResource(load);
    return <Suspense fallback={<em>pending</em>}><Button id="async-host" label={data()} /></Suspense>;
  },
  F: () => <Button id="async-host"><Slow /></Button>,
};
export type Shape = keyof typeof scenarios;
export const AsyncApp = (props: { shape: Shape }) =>
  <Context.Provider value="provided">{scenarios[props.shape]()}</Context.Provider>;

// scripts/fixtures/react-ssr-suspense-client.ts
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { SuspenseHydration, hydrationPromise } from "./react-ssr-suspense-app";

const state = { ready: false, recoverable: [] as string[] };
Object.assign(window, { reactSuspense: state });
const Client = () => {
  React.useEffect(() => { state.ready = true; }, []);
  return React.createElement(SuspenseHydration, { promise: hydrationPromise() });
};
hydrateRoot(document.getElementById("root")!, React.createElement(Client), {
  onRecoverableError: (error) => state.recoverable.push(String(error)),
});

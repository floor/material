// scripts/fixtures/react-ssr-client.ts
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./react-ssr-app";
const state = { ready: false, recoverable: [] as string[] };
Object.assign(window, { reactSSR: state });
const Client = () => {
  React.useEffect(() => { state.ready = true; }, []);
  return React.createElement(App, { mismatch: location.search.includes("mismatch") });
};
hydrateRoot(document.getElementById("root")!, React.createElement(Client), {
  onRecoverableError: error => state.recoverable.push(String(error)),
});

import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { ContextApp } from "./react-ssr-context-app";

const state = { ready: false, recoverable: [] as string[] };
Object.assign(window, { reactContextSSR: state });
const Client = () => {
  React.useEffect(() => { state.ready = true; }, []);
  return React.createElement(ContextApp);
};
hydrateRoot(document.getElementById("root")!, React.createElement(Client), {
  onRecoverableError: error => state.recoverable.push(String(error)),
});

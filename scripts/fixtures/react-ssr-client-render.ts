// A client-only render of the SSR app, so its host attributes can be compared
// with the hydrated page. No server HTML, so no host carries data-mtrl-ssr.
import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./react-ssr-app";

createRoot(document.getElementById("root") as HTMLElement).render(React.createElement(App));
(window as unknown as { rendered: boolean }).rendered = true;

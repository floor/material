import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./react-app";

createRoot(document.getElementById("root") as HTMLElement).render(React.createElement(App));
(window as unknown as { rendered: boolean }).rendered = true;

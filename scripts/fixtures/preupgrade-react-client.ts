import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./preupgrade-react-app";

hydrateRoot(document.getElementById("root") as HTMLElement, React.createElement(App));
(window as unknown as { ready: boolean }).ready = true;

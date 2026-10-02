// scripts/fixtures/react-ssr-server.ts
import "material/ssr/react";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { App } from "./react-ssr-app";
export const render = () => renderToString(React.createElement(App));

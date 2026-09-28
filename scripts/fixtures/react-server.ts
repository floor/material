import * as React from "react";
import { renderToString } from "react-dom/server";
import { App } from "./react-app";

export const render = (): string => renderToString(React.createElement(App));

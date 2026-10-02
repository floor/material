import "material/ssr/react";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { ContextApp } from "./react-ssr-context-app";

export const render = () => renderToString(React.createElement(ContextApp));

import "material/ssr/react";
import React from "react";
import { renderToString } from "react-dom/server";
import { TextField } from "../../../dist/react/text-field.js";
import { namedField } from "./shared";

export const render = (): string =>
  renderToString(React.createElement(TextField as React.ComponentType<Record<string, unknown>>, namedField));

import React from "react";
import { hydrateRoot } from "react-dom/client";
import { TextField } from "../../../dist/react/text-field.js";
import { namedField } from "./shared";

const count = (): void => {
  const w = window as unknown as { adapterEvents?: number };
  w.adapterEvents = (w.adapterEvents ?? 0) + 1;
};

// The field attaches `onTrailing` in an effect. A parent effect runs after it,
// so `ready` means the handler is listening.
const Client = (): React.ReactElement => {
  React.useEffect(() => {
    (window as unknown as { ready: boolean }).ready = true;
  }, []);
  return React.createElement(TextField as React.ComponentType<Record<string, unknown>>, { ...namedField, onTrailing: count });
};

hydrateRoot(document.getElementById("root") as HTMLElement, React.createElement(Client));

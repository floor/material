import { createComponent } from "solid-js";
import { hydrate } from "solid-js/web";
import { TextField } from "../../../dist/solid/text-field.js";
import { namedField } from "./shared";

const count = (): void => {
  const w = window as unknown as { adapterEvents?: number };
  w.adapterEvents = (w.adapterEvents ?? 0) + 1;
};

hydrate(
  () => createComponent(TextField as never, { ...namedField, onTrailing: count }),
  document.getElementById("root") as HTMLElement,
);
(window as unknown as { ready: boolean }).ready = true;

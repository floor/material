import { createSSRApp, h } from "vue";
import { MTextField as TextField } from "../../../dist/vue/text-field.js";
import { namedField } from "./shared";

const count = (): void => {
  const w = window as unknown as { adapterEvents?: number };
  w.adapterEvents = (w.adapterEvents ?? 0) + 1;
};

createSSRApp({
  render: () => h(TextField as never, { ...namedField, onTrailing: count }),
}).mount("#root");
(window as unknown as { ready: boolean }).ready = true;

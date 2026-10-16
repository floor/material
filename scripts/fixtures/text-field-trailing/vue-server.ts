import "material/ssr/vue";
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { MTextField as TextField } from "../../../dist/vue/text-field.js";
import { namedField } from "./shared";

export const render = (): Promise<string> =>
  renderToString(createSSRApp({ render: () => h(TextField as never, namedField) }));

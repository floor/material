import { createSSRApp } from "vue";
import { renderToString } from "@vue/server-renderer";
import { App } from "./vue-app";

export const render = (): Promise<string> => renderToString(createSSRApp(App));

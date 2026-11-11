import "material/ssr/react";
import "material/ssr/vue";
import "material/ssr/svelte";
import "material/ssr/solid";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createSSRApp, h } from "vue";
import { renderToString as renderVue } from "vue/server-renderer";
import { render as renderSvelte } from "svelte/server";
import { createComponent } from "solid-js";
import { renderToString as renderSolid } from "solid-js/web";
import { Button as ReactButton } from "material/react";
import { MButton as VueButton } from "material/vue";
import { Button as SolidButton } from "material/solid";
import SvelteApp from "./SvelteApp.svelte";

export async function renderFrameworks(check = () => {}) {
  const rows = {};
  rows.react = renderToStaticMarkup(createElement(ReactButton, { variant: "filled" }, "Save"));
  check("React render");
  rows.vue = await renderVue(createSSRApp({ render: () => h(VueButton, { variant: "filled" }, () => "Save") }));
  check("Vue render");
  rows.svelte = renderSvelte(SvelteApp).body;
  check("Svelte render");
  rows.solid = renderSolid(() => createComponent(SolidButton, { variant: "filled", children: "Save" }));
  check("Solid render");
  return rows;
}

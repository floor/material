import { assert, capture, cold, nativeLayout, unchanged } from "./realm.js";
import { renderElement } from "material/ssr";
import "material/ssr/react";
import "material/ssr/svelte";
import "material/ssr/vue";
import "material/ssr/solid";
import { configureHTML } from "material/core/dom";
import { renderFrameworks } from "./frameworks.js";

unchanged(cold, "cold imports");
const bridge = globalThis[Symbol.for("mtrl.ssr")];
for (const name of ["react", "svelte", "vue", "solid"]) assert(typeof bridge[name] === "function", `${name}: bridge registered`);
const ownKeys = Reflect.ownKeys(globalThis);
const native = capture();
const nativeTimeout = setTimeout;
const nativeDefine = Object.defineProperty;
let queued = 0, requests = 0;
const clean = phase => {
  unchanged(native, phase);
  assert(Object.defineProperty === nativeDefine, `${phase}: native defineProperty identity`);
  // Vue's createSSRApp establishes its own renderer marker; it is not a DOM
  // global installed by a Material render scope. No other additions are allowed.
  const after = Reflect.ownKeys(globalThis).filter(key => key !== "__VUE__");
  const before = ownKeys.filter(key => key !== "__VUE__");
  assert(after.length === before.length && after.every(key => before.includes(key)), `${phase}: leaked global ${after.filter(key => !before.includes(key)).map(String)}`);
  assert(queued === 0, `${phase}: queued SSR callback ran`);
};
const render = mode => {
  const random = Math.random;
  Math.random = () => 0.123456;
  try {
    return renderElement("m-button", { variant: "filled" }, "Save", mode === "link" ? { styles: "link", cssBase: "/assets/css" } : {});
  } finally { Math.random = random; }
};
export default {
  async fetch(request) {
    try {
      clean("request start");
      requests++;
      const phase = new URL(request.url).pathname;
      let failure = "";
      if (phase === "/failure") {
        // This callback runs inside the installed server scope, after the
        // native globals have been shadowed, and schedules only inert work.
        configureHTML({ sanitize() {
          assert(typeof Reflect.get(globalThis, "window") === "object" && Reflect.get(globalThis, "self") === Reflect.get(globalThis, "window"), "failure reached installed scope");
          setTimeout(() => queued++, 0);
          queueMicrotask(() => queued++);
          throw new Error("deliberate worker render failure");
        } });
        try { render("inline"); } catch (error) { failure = error.message; }
        finally { configureHTML(null); }
        assert(failure === "SSR <m-button>: deliberate worker render failure", `expected in-scope render failure, got ${JSON.stringify(failure)}`);
        clean("failed render");
      }
      if (phase === "/partial-install") {
        const define = Object.defineProperty;
        let replaced = 0;
        Object.defineProperty = (target, key, descriptor) => {
          if (target === globalThis && key === "document") throw new Error("deliberate partial install failure");
          if (target === globalThis) replaced++;
          return define(target, key, descriptor);
        };
        try { render("inline"); } catch (error) { failure = error.message; }
        finally { Object.defineProperty = define; }
        assert(replaced > 0 && failure === "SSR <m-button>: deliberate partial install failure", `expected partial install failure, got ${JSON.stringify(failure)}`);
        clean("partial install rollback");
      }
      const inline = render("inline");
      clean("successful inline render");
      const link = render("link");
      clean("successful link render");
      for (const html of [inline, link]) {
        assert(html.includes('<template shadowrootmode="open"'), "declarative root");
        assert(html.includes("Save") && html.includes("data-mtrl-ssr"), "rendered content");
      }
      assert(inline.includes("<style>") && link.includes('/assets/css/'), "inline/link styles");
      const random = Math.random;
      Math.random = () => 0.123456;
      let frameworks;
      try { frameworks = await renderFrameworks(clean); }
      finally { Math.random = random; }
      for (const [name, html] of Object.entries(frameworks)) {
        assert(html.includes('<template shadowrootmode="open"') && html.includes("Save"), `${name}: real framework declarative root`);
      }
      await new Promise(resolve => nativeTimeout(resolve, 0));
      clean("next task");
      return Response.json({ requests, phase, failure, inline, link, frameworks, nativeLayout, bridges: ["react", "svelte", "vue", "solid"], globals: "restored" });
    } catch (error) {
      return new Response(error.stack, { status: 500 });
    }
  },
};

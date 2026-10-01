// test/ssr/svelte-shadow.fixture.ts
// Spawned by svelte-shadow.test.ts. No DOM shim: this process is the server.
import { expect, test } from "bun:test";
import { buttonElement, carouselElement, tabsElement } from "../../src/elements";
import { adapter, shadowMarkup } from "../../src/svelte/runtime";

type Push = { push: (html: string) => void };

test("an unregistered server returns no template; registration renders one and opt-outs render none", async () => {
  const button = adapter(buttonElement.spec, () => "m-button");
  const props = { variant: "filled", disabled: true, onclick: () => undefined };
  expect(shadowMarkup(button, props, undefined, {})).toBe("");

  await import("../../scripts/fixtures/ssr-css");
  await import("../../src/ssr/svelte");
  const bridge = (globalThis as unknown as Record<symbol, { shadow?: unknown; svelte?: unknown }>)[Symbol.for("mtrl.ssr")];
  expect(typeof bridge.shadow).toBe("function");
  expect(typeof bridge.svelte).toBe("function");

  const html = shadowMarkup(button, props, undefined, {});
  expect(html.startsWith('<template shadowrootmode="open" shadowrootdelegatesfocus="">')).toBe(true);
  expect(html.endsWith("</template>")).toBe(true);
  expect(html).toContain("mtrl-button");
  expect(html).toContain("disabled");
  expect(html).not.toContain("onclick");

  const light = (renderer: Push) => { renderer.push("<span>Light content</span>"); };
  const carousel = adapter(carouselElement.spec, () => "m-carousel");
  expect(shadowMarkup(carousel, { "aria-label": "Photos" }, light as never, {})).toBe("");

  const tabs = adapter(tabsElement.spec, () => "m-tabs");
  const tabsLight = (renderer: Push) => {
    renderer.push('<m-tab value="a">Flights</m-tab><m-tab value="b">Trips</m-tab>');
  };
  const tabsHtml = shadowMarkup(tabs, { value: "a" }, tabsLight as never, {});
  expect(tabsHtml).toContain('<template shadowrootmode="open" shadowrootdelegatesfocus="">');
  expect(tabsHtml).toContain("Flights");
  expect(tabsHtml).toContain("Trips");
});

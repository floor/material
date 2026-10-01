// scripts/check-elements-ssr.ts
import assert from "node:assert/strict";
import type { Browser } from "playwright";

/** The parser reaches declarative templates after an early custom-element definition. */
export async function checkDeclarativeUpgrade(browser: Browser): Promise<void> {
  const bundle = await Bun.build({ entrypoints: ["scripts/fixtures/ssr-parity.ts"], target: "browser", format: "iife" });
  assert(bundle.success, String(bundle.logs));
  const js = await bundle.outputs[0].text();
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.route("https://mtrl.test/fixture.js", route => route.fulfill({ contentType: "text/javascript", body: js }));
    await page.setContent(`<!doctype html><head><script src="https://mtrl.test/fixture.js"></script><script>
      customElements.define('x-probe', class extends HTMLElement {
        constructor() { super(); this.attachShadow({mode: 'open'}); }
      });
      ssrParity.upgrade();
    </script></head><body>
      <x-probe><template shadowrootmode="open"><p>Server</p></template></x-probe>
      <m-button id="empty"><template shadowrootmode="open"><p>Server</p></template></m-button>
      <m-button id="label" label="Save"><template shadowrootmode="open"><p>Server</p></template></m-button>
      <m-button id="light"><template shadowrootmode="open"><p>Server</p></template>Save</m-button>
      <m-divider id="divider"><template shadowrootmode="open"><p>Server</p></template></m-divider>
      <m-button id="preserved"><template id="ordinary"><b>Inert</b></template><span shadowrootmode="open">Text</span><div><template id="nested" shadowrootmode="open">Nested</template></div></m-button>
    </body>`);
    const state = await page.evaluate(() => {
      const get = (id: string) => document.getElementById(id)!;
      return {
        probe: !!document.querySelector('x-probe > template[shadowrootmode]'),
        leftovers: ["empty", "label", "light", "divider"].map(id => get(id).querySelectorAll(":scope > template[shadowrootmode]").length),
        rendered: ["empty", "label", "light", "divider"].map(id => !!get(id).shadowRoot?.querySelector("[part]")),
        emptySlot: !!get("empty").shadowRoot?.querySelector("slot"),
        label: get("label").shadowRoot?.querySelector("slot")?.textContent,
        light: get("light").textContent,
        ordinary: !!get("preserved").querySelector("#ordinary"),
        attribute: !!get("preserved").querySelector("span[shadowrootmode]"),
      };
    });
    assert.deepEqual(errors, [], "early definition errors");
    assert.equal(state.probe, true, "reproduce the parser's leftover template before testing cleanup");
    assert.deepEqual(state.leftovers, [0, 0, 0, 0], "upgrade removes direct declarative templates");
    assert.deepEqual(state.rendered, [true, true, true, true]);
    assert.equal(state.emptySlot, false, "a declarative template is not label content");
    assert.equal(state.label, "Save");
    assert.equal(state.light, "Save");
    assert.equal(state.ordinary, true);
    assert.equal(state.attribute, true);
    // Fragment parsing leaves nested declarative templates inert. Only direct children are removed.
    const nested = await page.evaluate(async () => {
      const host = document.createElement("m-button");
      const wrapper = document.createElement("div");
      const template = document.createElement("template");
      template.setAttribute("shadowrootmode", "open");
      wrapper.append(template); host.append(wrapper); document.body.append(host);
      await Promise.resolve();
      return template.parentElement === wrapper;
    });
    assert.equal(nested, true);
    assert.deepEqual(errors, []);
    console.log("  ok declarative upgrade: parser leftover reproduced, removed, content preserved");
  } finally { await page.close(); }
}

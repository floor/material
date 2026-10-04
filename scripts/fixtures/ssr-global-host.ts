// scripts/fixtures/ssr-global-host.ts
// Host attributes the SSR bridges must render. The framework emits
// them on the host; the shadow markup must not receive a copy.
import assert from "node:assert/strict";

export const GLOBAL_ATTRS: ReadonlyArray<readonly [string, string]> = [
  ["popover", "auto"],
  ["inputmode", "numeric"],
  ["enterkeyhint", "send"],
  ["itemprop", "name"],
  ["nonce", "abc"],
];

// Chromium refuses attachInternals on any element that carries `is` (it treats
// the host as a customized built-in). Server renders still prove `is`; the
// hydration pages leave it off so the element can upgrade.
export const GLOBAL_ATTRS_WITH_IS: ReadonlyArray<readonly [string, string]> = [
  ...GLOBAL_ATTRS,
  ["is", "x-y"],
];

export const GLOBAL_HOST_DOM = {
  shadow: true,
  popover: "auto",
  inputmode: "numeric",
  enterkeyhint: "send",
  itemprop: "name",
  nonce: "abc",
} as const;

/** Read `#globals` in a browser page. Passed to Playwright; it closes over nothing. */
export const readGlobalHost = (): {
  shadow: boolean;
  popover: string | null;
  inputmode: string | null;
  enterkeyhint: string | null;
  itemprop: string | null;
  nonce: string | null;
} => {
  const host = document.getElementById("globals");
  const read = (name: string): string | null => host?.getAttribute(name) ?? null;
  return {
    shadow: !!host?.shadowRoot,
    popover: read("popover"),
    inputmode: read("inputmode"),
    enterkeyhint: read("enterkeyhint"),
    itemprop: read("itemprop"),
    nonce: read("nonce"),
  };
};

/** The host carries the attributes; the declarative template does not. */
export const assertGlobalHost = (html: string, attrs: ReadonlyArray<readonly [string, string]> = GLOBAL_ATTRS): void => {
  const idAt = html.indexOf('id="globals"');
  assert(idAt !== -1, "globals host missing");
  const start = html.lastIndexOf("<", idAt);
  const templateAt = html.indexOf('<template shadowrootmode="open"', idAt);
  assert(templateAt !== -1, "globals template missing");
  const templateEnd = html.indexOf("</template>", templateAt);
  assert(templateEnd !== -1, "globals template did not close");
  const opening = html.slice(start, templateAt);
  const template = html.slice(templateAt, templateEnd);
  for (const [name, value] of attrs) {
    const pattern = new RegExp(`(?:^|\\s)${name}="${value}"(?=\\s|>|/)`, "i");
    assert.match(opening, pattern, `host missing ${name}`);
    assert.doesNotMatch(template, pattern, `${name} leaked into shadow markup`);
  }
  assert.match(template, /mtrl-button/);
};

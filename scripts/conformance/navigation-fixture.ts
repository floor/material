import assert from "node:assert/strict";
import { CONFORMANCE_PROPERTIES, createConformanceHarness, type Case, type Part, type State } from "./measure";

export type NavigationCase = {
  scheme: "light" | "dark";
  direction: "ltr" | "rtl";
  selected: boolean;
  disabled: boolean;
  state: State;
};

type NavigationFixture = {
  component: string;
  mount: Case["mount"];
  item: string;
  variants: Record<string, { config: object; parts: Part[]; geometryOnly?: boolean }>;
};

export async function measureNavigation({ component, variants, mount, item }: NavigationFixture) {
  const engine = process.argv.includes("--webkit") ? "webkit" : "chromium";
  const filter = process.argv.find(arg => arg.startsWith("--case="))?.slice(7);
  const cases: Case[] = [];
  for (const [variant, { config, parts, geometryOnly }] of Object.entries(variants)) {
    const add = (scheme: NavigationCase["scheme"], direction: NavigationCase["direction"], selected: boolean, state: State, density = 0) => {
      const interaction = { hover: ":hover", pressed: ":active", focus: ":focus" }[state as "hover" | "pressed" | "focus"];
      cases.push({
        id: [variant, scheme, direction, selected ? "selected" : "unselected", state, density].join("/"),
        scheme, state, density, mount, focusTarget: state === "focus" ? item : undefined,
        config: { ...config, scheme, direction, selected, disabled: state === "disabled", state },
        properties: [...CONFORMANCE_PROPERTIES, "fill", "direction", "alignItems", "justifyContent", "flexDirection", "position",
          "paddingInlineStart", "paddingInlineEnd", "paddingBlockStart", "paddingBlockEnd", "marginBlockStart", "visibility", "overflowX"],
        parts: [
          { name: "item", selector: item },
          ...parts,
          ...(interaction ? [{ name: "interaction", selector: item + interaction }] : []),
          ...(state === "focus" ? [{ name: "focusVisible", selector: item + ":focus-visible" }] : []),
        ],
      });
    };
    add("light", "ltr", true, "rest");
    add("light", "rtl", true, "rest");
    for (const density of [-1, -2, -3]) add("light", "ltr", true, "rest", density);
    if (geometryOnly) {
      add("dark", "ltr", true, "rest");
      continue;
    }
    for (const scheme of ["light", "dark"] as const) {
      if (scheme === "dark") add(scheme, "ltr", true, "rest");
      for (const selected of [true, false]) {
        if (!selected) add(scheme, "ltr", false, "rest");
        for (const state of ["hover", "focus", "pressed"] as const) add(scheme, "ltr", selected, state);
      }
      add(scheme, "ltr", false, "disabled");
    }
  }
  const wanted = filter ? cases.filter(row => row.id.includes(filter)) : cases;
  assert.ok(wanted.length, "No matching fixture cases");
  const harness = await createConformanceHarness({ component, engine });
  const errors: string[] = [];
  harness.page.on("pageerror", error => errors.push(error.message));
  try {
    const rows = await harness.measure(wanted);
    for (const row of rows) {
      for (const name of ["item", "container", "indicator"]) {
        const part = row.parts[name];
        assert.ok(part && part.rect.width > 0 && part.rect.height > 0, `${row.id}: missing ${name} box`);
      }
      if (["focus", "pressed", "hover"].includes(row.state)) assert.ok(row.parts.interaction, row.id);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ source: harness.source, engine, rows }, null, 2));
  } finally {
    await harness.close();
  }
}

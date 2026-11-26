import assert from "node:assert/strict";
import { createConformanceHarness, fixtureEngine, selectFixtureCases, type Case } from "./measure";

type Fixture = {
  variant: "full-width" | "inset" | "middle-inset";
  orientation: "horizontal" | "vertical";
  dir: "ltr" | "rtl";
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const { dir, ...config } = data as Fixture;
  const create = mtrl.createDivider as unknown as (config: object) => { element: HTMLElement };
  const rail = document.createElement("div");
  rail.dir = dir;
  Object.assign(rail.style, { display: "flex", flexDirection: config.orientation === "horizontal" ? "column" : "row", width: "320px", height: "120px" });
  rail.dataset.fixture = "";
  const divider = create(config);
  rail.append(divider.element);
  host.append(rail);
  if (!divider.element.matches('hr, [role="separator"]')) throw new Error("Divider fixture did not mount a separator");
};

const cases: Case[] = (["full-width", "inset", "middle-inset"] as const).flatMap(variant =>
  (["horizontal", "vertical"] as const).flatMap(orientation =>
    (["ltr", "rtl"] as const).flatMap(dir => (["light", "dark"] as const).map(scheme => ({
      id: `${variant}/${orientation}/${dir}/${scheme}`,
      mount, scheme, config: { variant, orientation, dir },
      parts: [
        { name: "divider", selector: 'hr, [role="separator"]' },
        { name: "fixture", selector: "[data-fixture]" },
      ],
      properties: ["backgroundColor", "borderTopColor", "borderTopWidth", "marginInlineStart", "marginInlineEnd", "marginBlockStart", "marginBlockEnd"],
    }))),
  ),
);

const engine = fixtureEngine();
const harness = await createConformanceHarness({ component: "divider", engine });
try {
  const rows = await harness.measure(selectFixtureCases(cases));
  for (const row of rows) assert.ok(row.parts.divider && row.parts.fixture, row.id);
  console.log(JSON.stringify({ source: harness.source, engine, rows }, null, 2));
} finally {
  await harness.close();
}

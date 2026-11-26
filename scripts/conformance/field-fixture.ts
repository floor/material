import assert from "node:assert/strict";
import { CONFORMANCE_PROPERTIES,createConformanceHarness,type Case,type Part } from "./measure";

export const fieldProperties = [...CONFORMANCE_PROPERTIES,
  "minWidth","paddingInlineStart","paddingInlineEnd","paddingBlockStart","paddingBlockEnd",
  "marginInlineStart","marginInlineEnd","marginBlockStart","marginBlockEnd","overflowY",
  "borderBottomColor","borderLeftColor","borderTopStyle","visibility","direction","caretColor","fill","filter",
] as const;

export const part = (name: string, selector: string, pseudo?: Part["pseudo"]): Part => ({name,selector,pseudo,document:true});

export type ReadState = "rest" | "hover" | "focus" | "pressed" | "disabled";

export function interaction(name: string, selector: string, state: ReadState): Part[] {
  const variants: Partial<Record<ReadState,string>> = {
    hover: ":hover", focus: ":focus-visible", pressed: ":active", disabled: ":disabled",
  };
  return variants[state] ? [part(name,selector+variants[state])] : [];
}

export async function runFieldFixture(component: string, cases: Case[], required: (id: string) => string[], packageEntry = false) {
  const engine = process.argv.includes("--webkit") ? "webkit" : "chromium";
  const filter = process.argv.find(arg=>arg.startsWith("--case="))?.slice(7);
  const picked = filter ? cases.filter(row=>row.id.includes(filter)) : cases;
  assert.ok(picked.length,"No matching cases");
  const widthOption = process.argv.find(arg => arg.startsWith("--viewport-width="));
  const width = widthOption ? Number(widthOption.slice("--viewport-width=".length)) : undefined;
  assert.ok(width === undefined || (Number.isInteger(width) && width > 0), "Viewport width must be a positive integer");
  const viewport = width ? { width, height: 600 } : undefined;
  const harness = await createConformanceHarness({component,engine,viewport,packageEntry});
  harness.page.setDefaultTimeout(6500);
  const errors: string[] = [];
  harness.page.on("pageerror",error=>errors.push(error.message));
  try {
    if (process.argv.includes("--reduced-motion")) await harness.page.emulateMedia({ reducedMotion: "reduce" });
    const rows = await harness.measure(picked);
    for (const row of rows) {
      for (const name of required(row.id)) {
        const item = row.parts[name];
        assert.ok(item && item.rect.width>0 && item.rect.height>0,`${row.id}: missing ${name} box`);
      }
      if (Object.hasOwn(row.parts,"verifiedState")) assert.ok(row.parts.verifiedState,`${row.id}: interaction did not land`);
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({source:harness.source,engine,rows},null,2));
  } finally { await harness.close(); }
}

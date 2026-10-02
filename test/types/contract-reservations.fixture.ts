// test/types/contract-reservations.fixture.ts
//
// What 3.0.0 takes out of the public contract so that later size work is not a
// breaking change (FLO-568's levers). Each is a statement about a public type,
// with no runtime to assert, so it is pinned here. Nothing in this file runs;
// the assertions are the test.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import type { ProgressComponent } from "../../src/components/progress";
import type { ProgressComponent as RootProgressComponent } from "../../src/index";

// --- Progress: how the indicator is drawn is not public -----------------------
//
// `canvas`, `resize`, `track`, `indicator` and `buffer` tied the public type to
// one way of drawing. They are still on the object the factory returns (the
// internal `ProgressInternals`), off `ProgressComponent`.

type DrawingMember = "canvas" | "resize" | "track" | "indicator" | "buffer";

export const progressHasNoDrawingMembers: Extract<keyof ProgressComponent, DrawingMember> extends never
  ? true
  : false = true;

// The same type from the package root
export const rootProgressHasNone: Extract<keyof RootProgressComponent, DrawingMember> extends never
  ? true
  : false = true;

// The assertion is about those five: the rest of the API is still there
export const progressKeepsItsApi: "element" | "setValue" | "setBuffer" | "getBuffer" extends keyof ProgressComponent
  ? true
  : false = true;

// The internal type is not an export of the component's entry point
// @ts-expect-error ProgressInternals is internal: reachable from ./types, not from the entry
export type { ProgressInternals } from "../../src/components/progress";

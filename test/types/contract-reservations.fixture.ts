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
import type { TabComponent } from "../../src/components/tabs";
import type { SliderComponent } from "../../src/components/slider";
import type { LabelComponent, LabelManager, LifecycleComponent } from "../../src/core/compose";
import type { withLifecycle } from "../../src/core/compose";
import type { withLifecycle as withLifecycleFromFeatures } from "../../src/core/compose/features";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

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

// --- Tabs: a tab's badge may not exist until it is shown ----------------------
//
// `tab.badge` and `getBadgeComponent()` admit undefined, so a tab may create
// its badge only when it shows it. (Under a gate without strictNullChecks
// these hold trivially; under the strict one they are the statement.)

export const tabBadgeMayBeUndefined: undefined extends TabComponent["badge"] ? true : false = true;
export const tabBadgeIsOptional: {} extends Pick<TabComponent, "badge"> ? true : false = true;
export const badgeGetterMayReturnUndefined: undefined extends ReturnType<TabComponent["getBadgeComponent"]>
  ? true
  : false = true;
// The methods that work whether the badge exists yet or not
export const tabKeepsItsBadgeMethods: "setBadge" | "getBadge" | "showBadge" | "hideBadge" extends keyof TabComponent
  ? true
  : false = true;

// --- Slider: the `components` bag is internal ---------------------------------
//
// It is a fallback the controller reads on its internal state type. The
// public component has no such member, and the internal types that name it
// are not exports of the slider's entry.

export const sliderHasNoComponentsBag: "components" extends keyof SliderComponent ? false : true = true;
export const sliderKeepsItsApi: "element" | "setValue" | "getValue" extends keyof SliderComponent ? true : false = true;
// @ts-expect-error SliderStateComponent is internal: not an export of the entry
export type { SliderStateComponent } from "../../src/components/slider";
// @ts-expect-error SliderElements is internal: not an export of the entry
export type { SliderElements } from "../../src/components/slider";

// --- Core: a public type's own parts are importable from the same entry -------
//
// `LabelComponent`, from `material/core/compose`, is `{ label: LabelManager }`.
// `LabelManager` was exported only from the nested `core/compose/features`; it
// is an export of `core/compose` too, beside the type that names it.

export const labelManagerIsImportable: Equals<LabelComponent["label"], LabelManager> = true;

// What the README imported from the closed `core/compose/features` comes from
// `core/compose`, with its types: the function and the component it returns.
export const lifecycleIsTheSameFunction: Equals<typeof withLifecycle, typeof withLifecycleFromFeatures> = true;
export type LifecycleFromCompose = LifecycleComponent;

// The internal type is not an export of the component's entry point
// @ts-expect-error ProgressInternals is internal: reachable from ./types, not from the entry
export type { ProgressInternals } from "../../src/components/progress";

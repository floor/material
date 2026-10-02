// test/types/removed-options.fixture.ts
//
// PR D: the deprecated members 0.10 promised to remove in 1.0 are gone from
// the types, so a 0.10 option is a compile error where it is written.
import type { CreateElementOptions } from "../../src/core/dom";
import type { BaseComponentConfig } from "../../src/core/config/component";
import type { DialogButton } from "../../src/components/dialog/types";
import type { TooltipConfig } from "../../src/components/tooltip";
import { TOOLTIP_DEFAULTS } from "../../src/components/tooltip/constants";

// @ts-expect-error rawClass: use class or className (unprefixed since FLO-117)
export const element: CreateElementOptions = { rawClass: "x" };
// @ts-expect-error rawClass: use class or className
export const config: BaseComponentConfig = { rawClass: "x" };
// @ts-expect-error a dialog button has no color option (FLO-324)
export const button: DialogButton = { text: "OK", color: "primary" };
// @ts-expect-error a rich tooltip is variant: 'rich' (FLO-324)
export const tooltip: TooltipConfig = { text: "Hi", rich: true };
// @ts-expect-error TOOLTIP_DEFAULTS.RICH was the default of the removed option
export const richDefault = TOOLTIP_DEFAULTS.RICH;

// Commit 2: rippleConfig's timing and opacity were never applied (FLO-268)
import type { ButtonConfig } from "../../src/components/button/types";
import type { RippleConfig } from "../../src/core/compose/features/ripple";
// @ts-expect-error rippleConfig.timing: the stylesheet draws the wave's motion
export const buttonRipple: ButtonConfig = { rippleConfig: { duration: 300, timing: "linear" } };
// @ts-expect-error opacity: the wave is the pressed state layer, drawn by the stylesheet
export const coreRipple: RippleConfig = { duration: 300, opacity: ["0.4", "0"] };

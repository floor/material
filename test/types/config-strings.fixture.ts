// FLO-295, from md3.io's docs audit: configs the runtime takes and the types
// refused.
import { createDrawer, createSegmentedButton } from "../../src";

// The segmented button's mode as its string value, as its density already was.
export const segmented = createSegmentedButton({ mode: "multi", density: "compact", segments: [{ text: "A" }] });

// The drawer's accessible name.
export const drawer = createDrawer({ ariaLabel: "Mail folders" });

// A value outside the union is still refused.
// @ts-expect-error: "several" is not a selection mode
export const wrong = createSegmentedButton({ mode: "several", segments: [] });

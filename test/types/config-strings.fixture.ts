// FLO-295, from md3.io's docs audit: configs the runtime takes and the types
// refused.
import { createButtonGroup, createDrawer } from "../../src";

// A connected button group's selection and density as string values (the segmented
// button this case covered was removed in 3.0.0, FLO-382).
export const connected = createButtonGroup({ kind: "connected", selection: "multi", density: "compact", buttons: [{ text: "A" }] });

// The drawer's accessible name.
export const drawer = createDrawer({ ariaLabel: "Mail folders" });

// A value outside the union is still refused.
// @ts-expect-error: "several" is not a selection mode
export const wrong = createButtonGroup({ selection: "several", buttons: [] });

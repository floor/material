import { h } from "vue";
import { MButton } from "mtrl/vue";

export const ok = h(MButton, { disabled: false, onChange: () => {} });

// @ts-expect-error disabled is a boolean
export const bad = h(MButton, { disabled: "no", onChange: () => {} });

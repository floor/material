import type { ComponentProps } from "svelte";
import { Button } from "mtrl/svelte";

const ok: ComponentProps<typeof Button> = { disabled: false, onchange: () => {} };

// @ts-expect-error disabled is a boolean
const bad: ComponentProps<typeof Button> = { disabled: "no", onchange: () => {} };

export { ok, bad };

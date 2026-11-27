// scripts/fixtures/text-field-chips-elements.ts
// The elements a chip-field browser check mounts, with the CSS the element
// modules register: `material/elements/css` is what a page imports, so the
// shadow roots in a check adopt what a consumer's would.
export * from "../../dist/elements/index.js";
import { defineAll } from "../../dist/elements/index.js";
import "../../dist/elements/css/index.js";

defineAll();

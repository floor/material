// Entry for scripts/check-a11y-svg-f.ts only. Not a package export.
// The name walk shares this bundle with the factories. The createButton
// consumer graph does not import it, so its default HTML stays unchanged.
export * from "../src/index";
export { enableDecorativeIcons } from "../src/core/compose/features/icon-decorate";

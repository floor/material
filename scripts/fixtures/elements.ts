// Browser entry for scripts/check-elements.ts: the built elements, their CSS
// modules and the factories they wrap, on window for the checks to drive.
// Built output, so the check covers what the package ships.
import "../../dist/elements/css/index.js";
import * as elements from "../../dist/elements/index.js";
import createSwitch from "../../dist/components/switch/index.js";
import createButton from "../../dist/components/button/index.js";
import createIconButton from "../../dist/components/icon-button/index.js";
import createFab from "../../dist/components/fab/index.js";
import createExtendedFab from "../../dist/components/extended-fab/index.js";
import createCheckbox from "../../dist/components/checkbox/index.js";

elements.defineAll();
Object.assign(window, { mtrl: {
  ...elements, createSwitch, createButton,
  createIconButton, createFab, createExtendedFab, createCheckbox,
}, ready: true });

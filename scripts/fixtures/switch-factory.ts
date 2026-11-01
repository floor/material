// Browser entry for scripts/check-switch-transition.ts: the switch factory as
// the package ships it, and nothing else. The check measures the page's linked
// stylesheet alone, so unlike elements.ts this entry may bring no CSS module.
import createSwitch from "../../dist/components/switch/index.js";

Object.assign(window, { createSwitch });

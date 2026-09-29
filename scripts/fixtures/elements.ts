// Browser entry for scripts/check-elements.ts: the built elements, their CSS
// modules and the factories they wrap, on window for the checks to drive.
// Built output, so the check covers what the package ships.
import "../../dist/elements/css/index.js";
import * as elements from "../../dist/elements/index.js";
import createSwitch from "../../dist/components/switch/index.js";
import createButton from "../../dist/components/button/index.js";
import createProgress from "../../dist/components/progress/index.js";
import createLoadingIndicator from "../../dist/components/loading-indicator/index.js";
import createBadge from "../../dist/components/badge/index.js";
import { createDivider } from "../../dist/components/divider/index.js";

elements.defineAll();
const factories = { createSwitch, createButton, createProgress, createLoadingIndicator, createBadge, createDivider };
Object.assign(window, { mtrl: { ...elements, ...factories }, ready: true });

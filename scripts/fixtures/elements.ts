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
import createIconButton from "../../dist/components/icon-button/index.js";
import createFab from "../../dist/components/fab/index.js";
import createExtendedFab from "../../dist/components/extended-fab/index.js";
import createCheckbox from "../../dist/components/checkbox/index.js";
import createSlider from "../../dist/components/slider/index.js";
import createTextfield from "../../dist/components/textfield/index.js";
import createRadios from "../../dist/components/radios/index.js";
import createNavigationRail from "../../dist/components/navigation-rail/index.js";
import createDrawer from "../../dist/components/drawer/index.js";
import createTopAppBar from "../../dist/components/top-app-bar/index.js";
import createBottomAppBar from "../../dist/components/bottom-app-bar/index.js";
import createList from "../../dist/components/list/index.js";
import createCard from "../../dist/components/card/index.js";
import createCarousel from "../../dist/components/carousel/index.js";

elements.defineAll();
const factories = {
  createSwitch, createButton,
  createProgress, createLoadingIndicator, createBadge, createDivider,
  createIconButton, createFab, createExtendedFab, createCheckbox,
  createSlider,
  createTextfield,
  createRadios,
  createNavigationRail, createDrawer, createTopAppBar, createBottomAppBar,
  createList, createCard, createCarousel,
};
Object.assign(window, { mtrl: { ...elements, ...factories }, ready: true });

// Button group and chips, the factories their elements wrap.
import createButtonGroup from "../../dist/components/button-group/index.js";
import { createChips } from "../../dist/components/chips/index.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, { createButtonGroup, createChips });

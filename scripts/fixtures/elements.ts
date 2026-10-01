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
import createToolbar from "../../dist/components/toolbar/index.js";
import createFabMenu from "../../dist/components/fab-menu/index.js";
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
  createNavigationRail, createDrawer, createTopAppBar, createBottomAppBar, createToolbar, createFabMenu,
  createList, createCard, createCarousel,
};
Object.assign(window, { mtrl: { ...elements, ...factories }, ready: true });

// Button group and chips, the factories their elements wrap.
import createButtonGroup from "../../dist/components/button-group/index.js";
import { createChips } from "../../dist/components/chips/index.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, { createButtonGroup, createChips });

// The factories with no element yet, mounted in a plain shadow root by the
// #244 checks: they must find focus in their own root, not the document's.
import createMenu from "../../dist/components/menu/index.js";
import createSelect from "../../dist/components/select/index.js";
import createDialog from "../../dist/components/dialog/index.js";
import createBottomSheet from "../../dist/components/bottom-sheet/index.js";
import createSideSheet from "../../dist/components/side-sheet/index.js";
import createSearch from "../../dist/components/search/index.js";
import createSnackbar from "../../dist/components/snackbar/index.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, {
  createMenu, createSelect, createDialog, createBottomSheet, createSideSheet, createSearch, createSnackbar,
});

// The top-layer menu checks adopt the menu's CSS into a plain shadow root
// the way the elements do.
import { registerStyles, applyStyles } from "../../dist/elements/styles.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, { registerStyles, applyStyles });

// The split button factory, for the parity check of <m-split-button>.
import createSplitButton from "../../dist/components/split-button/index.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, { createSplitButton });
// The tooltip, for the top-layer tooltip and snackbar checks: the factory
// rendering <m-tooltip> is compared with.
import createTooltip from "../../dist/components/tooltip/index.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, { createTooltip });
// The date and time pickers, for the parity checks of <m-datepicker> and <m-timepicker>.
import createDatePicker from "../../dist/components/datepicker/index.js";
import createTimePicker from "../../dist/components/timepicker/index.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, { createDatePicker, createTimePicker });

// Global component defaults, for the check that an element's nested parts
// carry their stylesheet (FLO-386: <m-dialog>'s buttons from the defaults).
import { setComponentDefaults, clearGlobalDefaults } from "../../dist/core/config/global.js";
Object.assign((window as unknown as { mtrl: object }).mtrl, { setComponentDefaults, clearGlobalDefaults });

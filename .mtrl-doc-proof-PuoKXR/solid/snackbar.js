import "material/elements/css/progress";
import "material/elements/css/button";
import "material/elements/css/icon-button";
import "material/elements/css/snackbar";
import { snackbarElement, defineSnackbar } from "../elements/snackbar.js";
import { createComponent } from "./create.js";
export const Snackbar = /*#__PURE__*/ createComponent(snackbarElement.spec, defineSnackbar, "Snackbar");

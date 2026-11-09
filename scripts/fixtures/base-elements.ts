// Built modules, as an element consumer imports them. No global ripple sheet.
import { defineButton, defineIconButton } from "../../dist/elements/index.js";
import "../../dist/elements/css/button.js";
import "../../dist/elements/css/icon-button.js";

defineButton();
defineIconButton();
document.body.insertAdjacentHTML("beforeend", '<m-button toggle>Save</m-button><m-icon-button aria-label="Add" icon="+"></m-icon-button>');
document.documentElement.dataset.ready = "true";

import "material/elements/css/progress";
import "material/elements/css/button";
import "material/elements/css/icon-button";
import "material/elements/css/button-group";
import { buttonGroupElement, defineButtonGroup } from "../elements/button-group.js";
import { createComponent } from "./create.js";
export const ButtonGroup = /*#__PURE__*/ createComponent(buttonGroupElement.spec, defineButtonGroup, "ButtonGroup");

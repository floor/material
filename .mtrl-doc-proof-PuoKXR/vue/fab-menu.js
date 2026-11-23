import "material/elements/css/fab";
import "material/elements/css/menu";
import "material/elements/css/fab-menu";
import { fabMenuElement, defineFabMenu } from "../elements/fab-menu.js";
import { createComponent } from "./create.js";
export const MFabMenu = /*#__PURE__*/ createComponent(fabMenuElement.spec, defineFabMenu, "MFabMenu");

import "material/elements/css/menu";
import { menuElement, defineMenu } from "../elements/menu.js";
import { createComponent } from "./create.js";
export const Menu = /*#__PURE__*/ createComponent(menuElement.spec, defineMenu, "Menu");

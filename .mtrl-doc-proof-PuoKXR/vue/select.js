import "material/elements/css/text-field";
import "material/elements/css/menu";
import "material/elements/css/select";
import { selectElement, defineSelect } from "../elements/select.js";
import { createComponent } from "./create.js";
export const MSelect = /*#__PURE__*/ createComponent(selectElement.spec, defineSelect, "MSelect");

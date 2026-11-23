import "material/elements/css/progress";
import "material/elements/css/button";
import "material/elements/css/menu";
import "material/elements/css/split-button";
import { splitButtonElement, defineSplitButton } from "../elements/split-button.js";
import { createComponent } from "./create.js";
export const SplitButton = /*#__PURE__*/ createComponent(splitButtonElement.spec, defineSplitButton, "SplitButton");

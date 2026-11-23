import "material/elements/css/timepicker";
import { timepickerElement, defineTimepicker } from "../elements/timepicker.js";
import { createComponent } from "./create.js";
export const MTimepicker = /*#__PURE__*/ createComponent(timepickerElement.spec, defineTimepicker, "MTimepicker");

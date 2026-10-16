import "../../../dist/elements/css/text-field.js";
import { defineTextField } from "../../../dist/elements/text-field.js";

defineTextField();
(window as unknown as { ready: boolean }).ready = true;

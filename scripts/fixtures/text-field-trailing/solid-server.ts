import "material/ssr/solid";
import { createComponent } from "solid-js";
import { generateHydrationScript, renderToString } from "solid-js/web";
import { TextField } from "../../../dist/solid/text-field.js";
import { namedField } from "./shared";

const app = (): unknown => createComponent(TextField as never, namedField);

export const render = (): string => renderToString(app);
export const hydrationScript = (): string => generateHydrationScript();

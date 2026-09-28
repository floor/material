// Browser entry for scripts/check-elements.ts: the elements and the factories
// they wrap, on window for the checks to drive.
import * as elements from "../../src/elements";
import createSwitch from "../../src/components/switch";
import createButton from "../../src/components/button";

const css = (await (await fetch("/components.json")).json()) as Record<string, string>;
elements.registerStyles(css);
elements.defineAll();
Object.assign(window, { mtrl: { ...elements, createSwitch, createButton }, ready: true });

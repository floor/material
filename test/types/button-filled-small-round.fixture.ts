import type { ButtonFilledSmallRoundElement } from "../../src/elements/button-filled-small-round";
declare const button: ButtonFilledSmallRoundElement;
button.variant = "filled";
button.size = "s";
button.shape = "round";
button.component?.setVariant("filled");
button.component?.setSize("s");
button.component?.setShape("round");
// @ts-expect-error Other profiles require the general element.
button.variant = "outlined";
// @ts-expect-error The public component cannot claim unsupported visual setters.
button.component?.setSize("xl");
// @ts-expect-error The public component cannot claim unsupported shapes.
button.component?.setShape("square");

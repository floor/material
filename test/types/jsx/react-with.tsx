// With mtrl/react/jsx, the bare tags type-check in React's JSX (FLO-333).
import type {} from "../../../src/react/jsx";

export const typed = <m-switch checked supporting-text="Help" className="x" />;
export const declaration = <m-tabs value="t1"><m-tab value="t1">One</m-tab></m-tabs>;
// @ts-expect-error -- checked is a boolean
export const wrong = <m-switch checked="yes" />;

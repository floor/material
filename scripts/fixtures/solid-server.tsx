import { generateHydrationScript, renderToString } from "solid-js/web";
import { App } from "./solid-app";

export const render = (): string => renderToString(() => <App />);
/** The script a Solid page carries in its head so the client can hydrate. */
export const hydrationScript = (): string => generateHydrationScript();

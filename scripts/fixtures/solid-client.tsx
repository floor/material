import { hydrate } from "solid-js/web";
import { App } from "./solid-app";

hydrate(() => <App />, document.getElementById("root") as HTMLElement);
(window as unknown as { hydrated: boolean }).hydrated = true;

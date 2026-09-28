import { hydrate } from "svelte";
import App from "./svelte-app.svelte";

hydrate(App, { target: document.getElementById("root") as HTMLElement });
(window as unknown as { hydrated: boolean }).hydrated = true;

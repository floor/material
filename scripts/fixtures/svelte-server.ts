import { render as renderApp } from "svelte/server";
import App from "./svelte-app.svelte";

export const render = (): string => renderApp(App).body;

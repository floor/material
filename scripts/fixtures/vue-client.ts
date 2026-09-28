import { createSSRApp } from "vue";
import { App } from "./vue-app";

createSSRApp(App).mount("#root");
(window as unknown as { hydrated: boolean }).hydrated = true;

// Browser entry for scripts/check-preupgrade.ts: the built elements and their
// CSS modules, loaded after the server-style HTML has been measured, as a
// page's deferred element script would be.
import "../../dist/elements/css/index.js";
import { defineAll } from "../../dist/elements/index.js";

defineAll();
(window as unknown as { ready: boolean }).ready = true;

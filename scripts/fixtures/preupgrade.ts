// Browser entry for scripts/check-preupgrade.ts: the built elements and their
// CSS modules, loaded after the server-style HTML has been measured, as a
// page's deferred element script would be.
import "../../dist/elements/css/index.js";
import { defineAll, defineIconButton, defineToolbar } from "../../dist/elements/index.js";

defineAll();
// The shape pin's custom-prefix hosts on the phase B page upgrade too.
defineIconButton({ prefix: "x" });
defineToolbar({ prefix: "x" });
(window as unknown as { ready: boolean }).ready = true;

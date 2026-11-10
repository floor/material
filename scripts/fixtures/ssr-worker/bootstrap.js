// Delay the bundled application (including external framework initialization)
// until after this separate entry has captured the actual cold native realm.
import { cold, unchanged } from "./realm.js";
let application;
export default {
  async fetch(request) {
    try {
      application ??= await import("./worker-bundle.mjs");
      unchanged(cold, "cold application import");
      return await application.default.fetch(request);
    } catch (error) {
      return new Response(error.stack, { status: 500 });
    }
  },
};

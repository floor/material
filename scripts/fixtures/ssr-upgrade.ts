// scripts/fixtures/ssr-upgrade.ts
import { defineAll } from "../../dist/elements/index.js";
import "../../dist/elements/css/index.js";
// Registration follows CSS in the same task, as a consumer's bootstrap does.
defineAll();

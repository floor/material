// The package for scripts/check-token-render.ts, on window. Runs against the build.
import * as m from "../../dist/index.js";

(window as unknown as { __m: unknown }).__m = m;

// scripts/fixtures/theme-runtime.ts
// The runtime-colour entry a browser check drives, bundled from src.
import { applyScheme, createScheme, Hct } from "../../src/theme";
import { sourceColorFromImage } from "../../src/theme/image";
import { createSchemeByName } from "../../src/theme/variants";

const runtime = { applyScheme, createScheme, createSchemeByName, sourceColorFromImage, Hct };
(window as unknown as { themeRuntime?: typeof runtime }).themeRuntime = runtime;

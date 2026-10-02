import { test, expect, describe } from "bun:test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const factories: Record<string, string> = {
  'chips': 'createChips',
  'divider': 'createDivider',
  'fab': 'createFab',
  'extended-fab': 'createExtendedFab',
  'icon-button': 'createIconButton',
  'bottom-sheet': 'createBottomSheet',
  'side-sheet': 'createSideSheet',
  'carousel': 'createCarousel',
  'navigation-bar': 'createNavigationBar',
  'navigation-rail': 'createNavigationRail',
  'text-field': 'createTextField'
};

const componentsDir = join(import.meta.dir, "../../src/components");

describe("component default exports", () => {
  const dirs = readdirSync(componentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const name of dirs) {
    if (!existsSync(join(componentsDir, name, "index.ts"))) {
      continue;
    }

    test(`${name} has its factory as the default export`, async () => {
      const mod = await import(`../../src/components/${name}/index.ts`);

      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");

      if (name in factories) {
        const namedExport = mod[factories[name]];
        expect(mod.default).toBe(namedExport);
      }
    });
  }
});

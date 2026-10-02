import { test, expect, describe } from "bun:test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const factories: Record<string, string> = {
  'tabs': 'createTabs',
  'split-button': 'createSplitButton',
  'drawer': 'createDrawer',
  'loading-indicator': 'createLoadingIndicator',
  'timepicker': 'createTimePicker',
  'tooltip': 'createTooltip',
  'extended-fab': 'createExtendedFab',
  'card': 'createCard',
  'progress': 'createProgress',
  'navigation-rail': 'createNavigationRail',
  'chips': 'createChips',
  'snackbar': 'createSnackbar',
  'datepicker': 'createDatePicker',
  'radios': 'createRadios',
  'side-sheet': 'createSideSheet',
  'toolbar': 'createToolbar',
  'fab': 'createFab',
  'fab-menu': 'createFabMenu',
  'checkbox': 'createCheckbox',
  'bottom-app-bar': 'createBottomAppBar',
  'slider': 'createSlider',
  'carousel': 'createCarousel',
  'top-app-bar': 'createTopAppBar',
  'search': 'createSearch',
  'dialog': 'createDialog',
  'button': 'createButton',
  'list': 'createList',
  'divider': 'createDivider',
  'menu': 'createMenu',
  'switch': 'createSwitch',
  'bottom-sheet': 'createBottomSheet',
  'navigation-bar': 'createNavigationBar',
  'text-field': 'createTextField',
  'select': 'createSelect',
  'icon-button': 'createIconButton',
  'button-group': 'createButtonGroup',
  'badge': 'createBadge'
};

const componentsDir = join(import.meta.dir, "../../src/components");

describe("component default exports", () => {
  const dirs = readdirSync(componentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => existsSync(join(componentsDir, name, "index.ts")));

  test("the factory table covers exactly the available component entries", () => {
    const tableKeys = Object.keys(factories).sort();
    const actualDirs = [...dirs].sort();
    expect(tableKeys).toEqual(actualDirs);
  });

  for (const name of dirs) {
    test(`${name} has its factory as the default export and by its name`, async () => {
      const mod = await import(`../../src/components/${name}/index.ts`);

      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");

      const factoryName = factories[name];
      const namedExport = mod[factoryName];
      
      expect(namedExport).toBeDefined();
      expect(mod.default).toBe(namedExport);
    });
  }
});

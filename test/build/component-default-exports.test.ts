import { test, expect, describe } from "bun:test";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const factories: Record<string, string> = {
  'datepicker': 'createDatePicker',
  'timepicker': 'createTimePicker',
};

const componentsDir = join(import.meta.dir, "../../src/components");

function getFactoryName(dirName: string) {
  if (dirName in factories) {
    return factories[dirName];
  }
  const pascalCase = dirName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  return `create${pascalCase}`;
}

describe("component default exports", () => {
  const dirs = readdirSync(componentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const name of dirs) {
    if (!existsSync(join(componentsDir, name, "index.ts"))) {
      continue;
    }

    test(`${name} has its factory as the default export and by its name`, async () => {
      const mod = await import(`../../src/components/${name}/index.ts`);

      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");

      const factoryName = getFactoryName(name);
      const namedExport = mod[factoryName];
      
      expect(namedExport).toBeDefined();
      expect(mod.default).toBe(namedExport);
    });
  }
});

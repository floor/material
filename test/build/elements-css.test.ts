import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { elements } from "../../src/elements";
import { BASE_HOST_STYLES } from "../../src/elements/define";

describe("Element CSS files (FLO-365)", () => {
  test("every .js module has a .css file equal to the registered string", async () => {
    const dir = "dist/elements/css";
    const files = await readdir(dir);
    const jsFiles = files.filter(f => f.endsWith(".js") && f !== "index.js");
    for (const jsFile of jsFiles) {
      const name = jsFile.replace(".js", "");
      const jsContent = await readFile(join(dir, jsFile), "utf-8");
      const cssContent = await readFile(join(dir, `${name}.css`), "utf-8");
      
      const expectedRegistration = `registerStyles({ ${JSON.stringify(name)}: ${JSON.stringify(cssContent)} });`;
      expect(jsContent).toContain(expectedRegistration);
    }
  });

  test("every element has a host file equal to BASE_HOST_STYLES plus its hostStyles", async () => {
    for (const element of Object.values(elements)) {
      const expected = BASE_HOST_STYLES + (element.spec.hostStyles ?? "");
      const content = await readFile(`dist/elements/css/hosts/${element.spec.name}.css`, "utf-8");
      expect(content).toBe(expected);
    }
  });

  test("the export patterns resolve to the files", () => {
    const cssPath = import.meta.resolve("mtrl/elements/css/button.css");
    expect(cssPath.endsWith("dist/elements/css/button.css")).toBe(true);
    
    const hostPath = import.meta.resolve("mtrl/elements/css/hosts/button.css");
    expect(hostPath.endsWith("dist/elements/css/hosts/button.css")).toBe(true);
  });
});

// test/type-shapes.test.ts
//
// A union member and an `extends` clause are public API: the values a config
// accepts, and the base a config type builds on. The export pins record names
// and kinds, not either of those, and a type-level fixture cannot carry an
// `extends` relation on its own: structural typing means an interface that
// repeats its base's members compiles the same once the base is dropped. So
// the declarations themselves are pinned in scripts/fixtures/type-shapes.json:
// every exported type alias that resolves to a union, and every heritage
// clause of an exported interface, on the root, component and core subpaths.
// A change fails here until the fixture is regenerated
// (`bun run type-shapes:update`) and its diff reviewed.
import { describe, expect, test } from "bun:test";
import { diffTypeShapes, readPinned, readTypeShapes, type TypeShapes } from "../scripts/type-shapes";

const now = readTypeShapes();

describe("the public types' shapes", () => {
  test("match the pinned lists: a removed or added member or base fails until the fixture is regenerated", async () => {
    const changes = diffTypeShapes(await readPinned(), now);
    expect(changes, `Run \`bun run type-shapes:update\` if intended:\n${changes.join("\n")}`).toEqual([]);
  });

  test("a config's accepted values are pinned, sorted so the pin does not move with the checker's union order", () => {
    expect(now.FabSize).toEqual({ kind: "union", members: ['"default"', '"large"', '"medium"'] });
  });

  test("a union written through a constant's values is pinned member by member, untruncated", () => {
    const themeRole = now.ThemeRole;
    expect(themeRole?.kind).toBe("union");
    const members = themeRole?.kind === "union" ? themeRole.members : [];
    // 46 values: a union printed with the checker's default truncation would
    // end in "… N more …" and pin nothing.
    expect(members.length).toBe(46);
    expect(members).toContain('"primary-container"');
    expect(members).toContain('"inverse-primary"');
  });

  test("a union written on a config property is pinned under the interface's name", () => {
    expect(now["ButtonConfig.type"]).toEqual({ kind: "union", members: ['"button"', '"reset"', '"submit"'] });
  });

  // The three holes measured on 6bf4566c: each declaration change below exits
  // 0 there, because only direct property unions were read.
  test("a union nested in an object property is pinned by its path", () => {
    expect(now["ResponsiveConfig.smallScreen.layout"]).toEqual({
      kind: "union",
      members: ["'icon-and-text'", "'icon-only'", "'text-only'"],
    });
  });

  test("a union nested in an array's element type is pinned by its path", () => {
    expect(now["DatePickerConfig.specialDates[].date"]).toEqual({ kind: "union", members: ["Date", "string"] });
  });

  test("an optional member's union is pinned where it is nested too", () => {
    expect(now["SelectConfig.menu.container"]).toEqual({ kind: "union", members: ["HTMLElement", "null"] });
  });

  test("a config's base types are pinned, in the order the declaration lists them", () => {
    expect(now.ButtonConfig).toEqual({ kind: "extends", bases: ["BaseComponentConfig"] });
    expect(now.InputComponent).toEqual({ kind: "extends", bases: ["ElementComponent", "InputFeature"] });
  });

  test("the scan reads every public entry the manifest lists, not a subset", () => {
    for (const name of ["FabSize", "ThemeRole", "SliderSize", "ToolbarVariant", "DatePickerInput", "ButtonConfig.type", "AttributeType"]) {
      expect(now[name]).toBeDefined();
    }
    expect(Object.keys(now).length).toBeGreaterThan(120);
  });
});

describe("what the diff reports", () => {
  const shapes = (value: TypeShapes): TypeShapes => value;
  const pinned = shapes({
    FabSize: { kind: "union", members: ['"default"', '"large"', '"medium"'] },
    ButtonConfig: { kind: "extends", bases: ["BaseComponentConfig"] },
  });

  test("a removed union member, by value", () => {
    const after = shapes({ ...pinned, FabSize: { kind: "union", members: ['"default"', '"large"'] } });
    expect(diffTypeShapes(pinned, after)).toEqual(['FabSize: union member "medium" was removed']);
  });

  test("a dropped or replaced base, by name", () => {
    const after = shapes({ ...pinned, ButtonConfig: { kind: "extends", bases: ["OtherBase"] } });
    expect(diffTypeShapes(pinned, after)).toEqual([
      "ButtonConfig: no longer extends BaseComponentConfig",
      "ButtonConfig: now extends OtherBase",
    ]);
  });

  test("a property union is reported under its interface's name", () => {
    const before = shapes({ ...pinned, "ButtonConfig.type": { kind: "union", members: ['"button"', '"reset"', '"submit"'] } });
    const after = shapes({ ...pinned, "ButtonConfig.type": { kind: "union", members: ['"button"', '"submit"'] } });
    expect(diffTypeShapes(before, after)).toEqual(['ButtonConfig.type: union member "reset" was removed']);
  });

  test("a nested property union is reported under its full path", () => {
    const before = shapes({ "SelectConfig.menu.container": { kind: "union", members: ["HTMLElement", "null"] } });
    const after = shapes({ "SelectConfig.menu.container": { kind: "union", members: ["HTMLElement"] } });
    expect(diffTypeShapes(before, after)).toEqual(["SelectConfig.menu.container: union member null was removed"]);
  });

  test("a type added to the surface", () => {
    const after = shapes({ ...pinned, FabSkew: { kind: "union", members: ['"a"', '"b"'] } });
    expect(diffTypeShapes(pinned, after)).toEqual(['FabSkew: added, union ("a" | "b")']);
  });
});

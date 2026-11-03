import { describe, expect, test } from "bun:test";
import { componentStyles, deferredDependencies, resolveStyleDependencies } from "../../scripts/style-manifest";

describe("CSS dependency validation", () => {
  test("orders shared dependencies once before their consumers", () => {
    const manifest = {
      button: { source: "button", dependencies: ["progress"] },
      progress: { source: "progress", dependencies: [] },
      group: { source: "group", dependencies: ["button", "progress"] },
    };
    expect(resolveStyleDependencies(["group", "button"], manifest)).toEqual(["progress", "button", "group"]);
  });
  test("rejects missing dependencies instead of publishing broken CSS imports", () => {
    expect(() => resolveStyleDependencies(["button"], {
      button: { source: "button", dependencies: ["progress"] },
    })).toThrow("Unknown CSS dependency: progress");
  });
  test("rejects cycles instead of recursing or emitting circular CSS", () => {
    expect(() => resolveStyleDependencies(["a"], {
      a: { source: "a", dependencies: ["b"] },
      b: { source: "b", dependencies: ["a"] },
    })).toThrow("CSS dependency cycle");
  });
  test("defers only direct dependencies of an entry that loads them on demand", () => {
    // The generated entry registers a loader per row and imports the rest; a
    // transitive dependency would leave its sheet out of the initial graph
    // with nobody loading it, and an eager one would ship twice.
    for (const [name, deferred] of Object.entries(deferredDependencies)) {
      expect(componentStyles[name], `${name} is not a style entry`).toBeDefined();
      for (const dependency of deferred) {
        expect(componentStyles[name].dependencies, `${name} does not depend on ${dependency}`).toContain(dependency);
      }
    }
  });
});

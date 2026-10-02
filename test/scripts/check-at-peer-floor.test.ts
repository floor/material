// test/scripts/check-at-peer-floor.test.ts
//
// CI runs the Solid and Vue SSR checks, and each adapter's declaration check, a
// second time on the lowest version of the peer that package.json allows
// (scripts/check-at-peer-floor.ts). The version comes from the range, so a range
// it cannot read must stop the run, not pick a version.
import { describe, expect, test } from "bun:test";
import { floorOf } from "../../scripts/check-at-peer-floor";

describe("floorOf", () => {
  test("is the lowest version a >= range allows", () => {
    expect(floorOf(">=1.8")).toBe("1.8.0");
    expect(floorOf(">=3.3")).toBe("3.3.0");
    expect(floorOf(">=18")).toBe("18.0.0");
    expect(floorOf(">= 5.2.1")).toBe("5.2.1");
  });

  test("refuses a range with no single floor", () => {
    for (const range of ["^3.5", "~1.8", "1.8", ">=1.8 <2", "*", ""]) expect(() => floorOf(range)).toThrow(TypeError);
  });

  test("reads the floor of every peer the floor scripts name", async () => {
    const { scripts, peerDependencies } = await Bun.file("package.json").json() as { scripts: Record<string, string>; peerDependencies: Record<string, string> };
    const floors = Object.entries(scripts).filter(([name]) => name.endsWith(":floor"));
    expect(floors.map(([name]) => name).sort()).toEqual([
      "react-types:floor", "solid-ssr:floor", "solid-types:floor", "svelte-types:floor", "vue-ssr:floor", "vue-types:floor",
    ]);
    for (const [, command] of floors) {
      const peer = /check-at-peer-floor\.ts (\S+)/.exec(command)![1];
      expect(floorOf(peerDependencies[peer])).toMatch(/^\d+\.\d+\.\d+$/);
    }
    expect(floorOf(peerDependencies["solid-js"])).toBe("1.8.0");
    expect(floorOf(peerDependencies.vue)).toBe("3.4.20");
    expect(floorOf(peerDependencies.react)).toBe("18.0.0");
    expect(floorOf(peerDependencies.svelte)).toBe("5.0.0");
  });
});

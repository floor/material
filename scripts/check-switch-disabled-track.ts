import assert from "node:assert/strict";
import { parseColour } from "./conformance/matrix-colours";
import { createConformanceHarness, fixtureEngine } from "./conformance/measure";

const engine = fixtureEngine();
const harness = await createConformanceHarness({ component: "switch", engine });
const { page } = harness;
const failures: string[] = [];
try {
  for (const mode of ["light", "dark"] as const) {
    for (const selected of [false, true]) {
      const paint = await page.evaluate(({ mode, selected }) => {
        document.documentElement.dataset.themeMode = mode;
        const host = document.querySelector("#mount")!;
        const { createSwitch } = (window as unknown as {
          mtrl: { createSwitch(config: { checked: boolean; disabled: boolean; ariaLabel: string }): { element: HTMLElement } };
        }).mtrl;
        host.replaceChildren(createSwitch({ checked: selected, disabled: true, ariaLabel: "Sync" }).element);
        const input = host.querySelector("input")!;
        if (!input.disabled || input.checked !== selected) throw new Error("Switch fixture did not reach the requested state");
        const track = getComputedStyle(host.querySelector(".mtrl-switch__track")!);
        const handle = getComputedStyle(host.querySelector(".mtrl-switch__thumb")!);
        const probe = document.createElement("span");
        host.append(probe);
        const reference = (role: string, opacity: number) => {
          probe.style.color = `color-mix(in srgb, var(--mtrl-sys-color-${role}) ${opacity}%, transparent)`;
          return getComputedStyle(probe).color;
        };
        return [
          ["fill", track.backgroundColor, reference(selected ? "on-surface" : "surface-container-highest", 12)],
          ["outline", track.borderTopColor, selected ? "rgba(0, 0, 0, 0)" : reference("on-surface", 12)],
          ["handle", handle.backgroundColor, reference(selected ? "surface" : "on-surface", selected ? 100 : 38)],
        ];
      }, { mode, selected });
      for (const [part, actual, expected] of paint) {
        const measured = parseColour(actual!);
        const reference = parseColour(expected!);
        if (measured.opacity !== reference.opacity || (reference.opacity > 0 && measured.hex !== reference.hex)) {
          failures.push(`${mode} ${selected ? "selected" : "unselected"} ${part} measured ${measured.hex} at ${measured.opacity}, expected ${reference.hex} at ${reference.opacity}`);
        }
      }
    }
  }
} finally {
  await harness.close();
}
assert.equal(failures.length, 0, failures.join("\n"));
console.log(`Disabled switch track colours and opacities passed in ${engine}.`);

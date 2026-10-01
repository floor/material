#!/usr/bin/env bun
// scripts/bench-ssr.ts
// Source CSS loading and fixture parsing are outside the measured calls.
import { parseHTML } from "linkedom";
import "./fixtures/ssr-css";
import { renderElement } from "../src/ssr/index.ts";
import { cases } from "./fixtures/preupgrade-cases";

const fixtures = cases.filter(c => c.variant === "default").map(fixture => {
  const host = parseHTML(`<html><body>${fixture.html}</body></html>`).document.body.firstElementChild!;
  return {
    element: fixture.element,
    attributes: Object.fromEntries(Array.from(host.attributes, a => [a.name, a.value])),
    children: host.innerHTML,
    samples: [] as number[],
  };
});
// Rotate the starting element each round to distribute GC/thermal effects.
const warmup = 20;
const rounds = 101;
for (let round = -warmup; round < rounds; round++) {
  for (let index = 0; index < fixtures.length; index++) {
    const fixture = fixtures[(index + round + warmup) % fixtures.length];
    const start = performance.now();
    renderElement(`m-${fixture.element}`, fixture.attributes, fixture.children);
    const elapsed = performance.now() - start;
    if (round >= 0) fixture.samples.push(elapsed);
  }
}
console.log(`Inline defaults: ${warmup} warmup + ${rounds} measured calls per element; median milliseconds`);
for (const fixture of fixtures) {
  fixture.samples.sort((a, b) => a - b);
  console.log(`${fixture.element}\t${fixture.samples[Math.floor(rounds / 2)].toFixed(3)}`);
}

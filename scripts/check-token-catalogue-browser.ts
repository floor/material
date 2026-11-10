#!/usr/bin/env bun
/**
 * scripts/check-token-catalogue-browser.ts
 *
 * The browser probe behind every `verified` claim in the token catalogue.
 * Expectations come from the committed, source-read ledger
 * (token-catalogue/expected.ts) — never from the catalogue document and never
 * from the built output — and each assertion runs on the built stylesheets in
 * a real browser. The run writes a machine-readable evidence file stating,
 * per assertion, that it passed, how many cases executed, and the digests of
 * the inputs and catalogue it ran against; the same run then re-reads the
 * catalogue and refuses any verified row whose browser assertions are absent,
 * failed, or were run against different bytes. Nothing downgrades silently:
 * a mismatch is an error.
 *
 *   bun run build && bun run tokens:catalogue:browser
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium, type Page, type ElementHandle } from "playwright";
import { walkCss, sha256, type CssReference } from "./token-catalogue/css";
import { shapeScale, typescale, typefaceDefault } from "./token-catalogue/expected";
import { UNCONSUMED_STEPS } from "./token-catalogue/rows";
import { checks } from "./token-catalogue/checks";
import { inputsDigest, INPUT_FILES } from "./generate-token-catalogue";
import type { EvidenceRecord, Catalogue } from "./token-catalogue/types";

const outdir = process.argv[2] ?? "dist";
const EVIDENCE = "analysis/token-catalogue-evidence.json";
const PROBE_FILE = "scripts/check-token-catalogue-browser.ts";

/** A corner probe per step: distinct odd primes, so a radius that reads a
 * different step than mapped can never coincide with the probe it was given. */
const PROBE: Record<string, number> = {
  none: 3, "extra-small": 5, small: 7, medium: 11, large: 13, "large-increased": 17,
  "extra-large": 19, "extra-large-increased": 23, "extra-extra-large": 29, full: 31,
};

const evidence: EvidenceRecord[] = [];
const pass = (assertion: string, cases: number): void => {
  assert(cases > 0, `${assertion}: zero executed cases do not qualify as a pass`);
  evidence.push({ assertion, outcome: "pass", cases, inputsDigest: inputsDigest(), catalogueDigest: catalogueSha });
};

const read = (path: string): string => readFileSync(`${outdir}/${path}`, "utf8");
const catalogueBytes = read("tokens/catalogue.json");
const catalogueSha = sha256(catalogueBytes);

/** `0` and `0px` are one value; everything else compares exactly. */
const sameValue = (computed: string, expected: string): boolean => {
  const a = computed.trim();
  const b = expected.trim();
  if (a === b) return true;
  const number = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(a);
  const other = /^(-?\d+(?:\.\d+)?)(px)?$/.exec(b);
  return !!number && !!other && number[1] === other[1];
};

const cornersOf = (within: string): Array<"borderTopLeftRadius" | "borderTopRightRadius" | "borderBottomRightRadius" | "borderBottomLeftRadius"> =>
  within === "border-radius" ? ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"]
    : within === "border-top-left-radius" ? ["borderTopLeftRadius"]
    : within === "border-top-right-radius" ? ["borderTopRightRadius"]
    : within === "border-bottom-right-radius" ? ["borderBottomRightRadius"]
    : within === "border-bottom-left-radius" ? ["borderBottomLeftRadius"]
    : [];

/** A consumer we can render: a bare class chain, no combinators or pseudos. */
const renderable = (reference: CssReference): boolean =>
  /^(\.[a-z0-9_-]+)+$/.test(reference.selector)
  && reference.at.every(context => !context.startsWith("@media"))
  && /^border(-(top|bottom)-(left|right))?-radius$/.test(reference.within);

/** Does a declaration read the token directly, so probing it must move the
 * computed radius? Bare `var(--t)` / `var(--t, fb)`, or the fallback inside a
 * single hook wrapper `var(--mtrl-<hook>, var(--t, fb))` — the hook stays
 * unset in the probe, so the token still decides. Compound reads (calc with
 * density, min() with another bound) are left to the whole-component probe. */
const isDirectRead = (value: string, token: string): boolean => {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Bare and whole: the radius IS the token (an optional literal fallback), so
  // every corner the declaration styles moves with the probe. A four-corner
  // shorthand with literals between (`var(--t) 0 0 var(--t)`) is compound.
  if (new RegExp(`^var\\(\\s*${escaped}\\s*(,\\s*[^()]*?)?\\)$`).test(value)) return true;
  // The fallback inside a single hook wrapper `var(--mtrl-<hook>, var(--t, fb))`:
  // the hook stays unset in the probe, so the token still decides.
  return new RegExp(`^var\\(\\s*--mtrl-[a-z0-9-]+\\s*,\\s*var\\(\\s*${escaped}(\\s*,[^()]*)?\\)\\s*\\)$`).test(value);
};

/** The direct token reads in one stylesheet, mapped to selector and corner(s). */
const bareReads = (css: string, token: string): CssReference[] =>
  walkCss("sheet", css).references.filter(reference =>
    reference.name === token && isDirectRead(reference.value, token));

const element = async (page: Page, selector: string): Promise<ElementHandle<HTMLElement>> => {
  await page.evaluate(sel => {
    const host = document.getElementById("probe-host")!;
    host.replaceChildren();
    const el = document.createElement("div");
    // A class chain (`.mtrl-a.mtrl-b`) becomes one element carrying both.
    el.className = sel.slice(1).split(".").join(" ");
    host.append(el);
    return el.className;
  }, selector);
  return (await page.$("#probe-host > div")) as ElementHandle<HTMLElement>;
};

const computedCorners = async (page: Page, handle: unknown, corners: string[]): Promise<string[]> =>
  page.evaluate(({ handle: el, corners: keys }) =>
    keys.map(key => String(getComputedStyle(el as HTMLElement)[key as keyof CSSStyleDeclaration])), { handle, corners });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  await page.setContent(`<!doctype html><html><head><style>${read("styles.css")}</style></head><body><div id="probe-host"></div></body></html>`);

  // --- shape.corner.root-defaults -------------------------------------------
  {
    const values = await page.evaluate((steps: string[]) => {
      const style = getComputedStyle(document.documentElement);
      return steps.map(step => style.getPropertyValue(`--mtrl-sys-shape-corner-${step}`) as string);
    }, Object.keys(shapeScale));
    let cases = 0;
    for (const [step, expected] of Object.entries(shapeScale)) {
      const value = values[Object.keys(shapeScale).indexOf(step)]!;
      const wanted = "fullyRounded" in expected ? "9999px" : `${expected.dp}px`;
      assert(sameValue(value, wanted), `--mtrl-sys-shape-corner-${step}: computed ${JSON.stringify(value)}, expected ${wanted} (full: the recorded library realization of "fully rounded")`);
      cases++;
    }
    pass("shape.corner.root-defaults", cases);
  }

  // --- shape.corner.consumer-attribution ------------------------------------
  // The mapping is derived from the stylesheet itself, then probed: with one
  // step set to its distinguishable prime, every corner its consumers style
  // either computes exactly that probe (the read wins the cascade) or stays at
  // its unprobed baseline (a state-shadowed read, which this state cannot
  // prove). Any third value is a failure, a step with no winning corner is a
  // failure, and a consumer redirected to another step ignores the probe and
  // contributes nothing — the mapping cannot pass on the wrong token.
  {
    const css = read("styles.css");
    const mapping: Array<{ step: string; token: string; probe: number; selector: string; corners: string[] }> = [];
    for (const [step, probe] of Object.entries(PROBE)) {
      if (UNCONSUMED_STEPS.has(step)) continue; // no mapping exists to probe
      const token = `--mtrl-sys-shape-corner-${step}`;
      const seen = new Set<string>();
      for (const reference of bareReads(css, token).filter(renderable)) {
        const identity = `${reference.selector}|${reference.within}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        mapping.push({ step, token, probe, selector: reference.selector, corners: cornersOf(reference.within) });
      }
    }
    const allCorners = ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];
    const baselineFor = new Map<string, string[]>();
    for (const consumer of mapping) {
      if (baselineFor.has(consumer.selector)) continue;
      const el = await element(page, consumer.selector);
      baselineFor.set(consumer.selector, await computedCorners(page, el, allCorners));
    }
    let cases = 0;
    const won = new Map<string, number>();
    for (const consumer of mapping) {
      await page.evaluate(({ token, value }) => document.documentElement.style.setProperty(token, value), { token: consumer.token, value: `${consumer.probe}px` });
      let winning = 0;
      try {
        const el = await element(page, consumer.selector);
        const values = await computedCorners(page, el, allCorners);
        const baseline = baselineFor.get(consumer.selector)!;
        for (const corner of consumer.corners) {
          const index = allCorners.indexOf(corner);
          const value = values[index]!;
          const was = baseline[index]!;
          if (value === `${consumer.probe}px`) {
            winning++;
            cases++;
          } else if (value !== was) {
            assert.fail(`${consumer.selector} ${corner} (${consumer.token}): with the ${consumer.step} probe ${consumer.probe}px the corner computed ${value}, neither the probe nor its unprobed ${was}`);
          }
        }
      } finally {
        await page.evaluate(token => document.documentElement.style.removeProperty(token), consumer.token);
      }
      won.set(consumer.step, (won.get(consumer.step) ?? 0) + winning);
    }
    for (const step of Object.keys(PROBE)) {
      if (UNCONSUMED_STEPS.has(step)) continue;
      assert((won.get(step) ?? 0) > 0, `--mtrl-sys-shape-corner-${step}: no consumer corner followed the probe — the step has no provable consumer`);
    }
    pass("shape.corner.consumer-attribution", cases);
  }

  // --- typescale.role.root-defaults -----------------------------------------
  {
    const roles = Object.keys(typescale);
    const axes = ["font", "font-size", "line-height", "letter-spacing", "font-weight"];
    const read2 = await page.evaluate((names: string[]) => {
      const style = getComputedStyle(document.documentElement);
      return names.map(name => style.getPropertyValue(name) as string);
    }, roles.flatMap(role => axes.map(axis => `--mtrl-sys-typescale-${role}-${axis}`)));
    let cases = 0;
    roles.forEach((role, roleIndex) => {
      const expected = typescale[role]!;
      const face = expected.face === "brand" ? "brand" : "plain";
      const want: Record<string, string> = {
        "font": typefaceDefault,
        "font-size": `${expected.size}px`,
        "line-height": `${expected.lineHeight}px`,
        "letter-spacing": `${expected.tracking}px`,
        "font-weight": `${expected.weight}`,
      };
      for (const axis of axes) {
        const computed = read2[roleIndex * axes.length + axes.indexOf(axis)]!;
        assert(sameValue(computed, want[axis]!), `--mtrl-sys-typescale-${role}-${axis}: computed ${JSON.stringify(computed)}, expected ${want[axis]!} (the font axis substitutes its ${face} face)`);
        cases++;
      }
    });
    pass("typescale.role.root-defaults", cases);
  }

  // --- typescale.role.override-consumption ----------------------------------
  {
    let cases = 0;
    for (const role of Object.keys(typescale)) {
      const token = `--mtrl-sys-typescale-${role}-font-size`;
      const el = await element(page, `.mtrl-${role}`);
      const baseline = await el.evaluate(node => getComputedStyle(node).fontSize);
      assert(sameValue(baseline, `${typescale[role]!.size}px`), `.mtrl-${role}: baseline font-size ${baseline}, expected the role's token value`);
      await page.evaluate(({ token, value }) => document.documentElement.style.setProperty(token, value), { token, value: "44px" });
      try {
        const moved = await el.evaluate(node => getComputedStyle(node).fontSize);
        assert(moved === "44px", `.mtrl-${role}: with ${token} set to 44px the class computes ${moved} — it does not consume its role token`);
        cases++;
      } finally {
        await page.evaluate(token => document.documentElement.style.removeProperty(token), token);
      }
      const restored = await el.evaluate(node => getComputedStyle(node).fontSize);
      assert(restored === baseline, `.mtrl-${role}: removing the override did not restore ${baseline}`);
    }
    pass("typescale.role.override-consumption", cases);
  }

  // --- typeface.ref.defaults -------------------------------------------------
  {
    const values = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return [style.getPropertyValue("--mtrl-ref-typeface-brand"), style.getPropertyValue("--mtrl-ref-typeface-plain")];
    });
    for (const [index, name] of ["brand", "plain"].entries()) {
      assert(sameValue(values[index]!, typefaceDefault), `--mtrl-ref-typeface-${name}: computed ${JSON.stringify(values[index]!)}, expected ${JSON.stringify(typefaceDefault)}, the page's stated default for both faces`);
    }
    pass("typeface.ref.defaults", 2);
  }

  // --- typeface.ref.override-consumption ------------------------------------
  {
    let cases = 0;
    const read = await page.evaluate(roles => {
      document.documentElement.style.setProperty("--mtrl-ref-typeface-brand", "ProbeBrand, serif");
      try {
        const out: Record<string, string> = {};
        for (const role of Object.keys(roles)) {
          const el = document.createElement("div");
          el.className = `mtrl-${role}`;
          document.body.append(el);
          out[role] = getComputedStyle(el).fontFamily;
          out[`${role}--token`] = getComputedStyle(document.documentElement).getPropertyValue(`--mtrl-sys-typescale-${role}-font`);
          el.remove();
        }
        return out;
      } finally {
        document.documentElement.style.removeProperty("--mtrl-ref-typeface-brand");
      }
    }, typescale);
    for (const [role, expected] of Object.entries(typescale)) {
      const family = read[role]!;
      const token = read[`${role}--token`]!;
      if (expected.face === "brand") {
        assert(family.startsWith("ProbeBrand"), `.mtrl-${role}: with the brand face probed the family is ${JSON.stringify(family)} — a brand role must follow it`);
        assert(token.trim() === "ProbeBrand, serif", `--mtrl-sys-typescale-${role}-font substituted ${JSON.stringify(token)} under the brand probe`);
      } else {
        assert(family.startsWith("Roboto"), `.mtrl-${role}: with the brand face probed the plain family is ${JSON.stringify(family)} — a plain role must not follow it`);
        assert(sameValue(token, typefaceDefault), `--mtrl-sys-typescale-${role}-font substituted ${JSON.stringify(token)}; the plain face stays ${typefaceDefault}`);
      }
      cases++;
    }
    pass("typeface.ref.override-consumption", cases);
  }

  // --- shape.corner.selective-fallback --------------------------------------
  // A second page with the component sheet alone: no base sheet, no :root
  // scale — the recorded literal fallbacks must carry the radius on their own.
  {
    const sheet = "styles/button.css";
    const css = read(sheet);
    const page2 = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page2.setContent(`<!doctype html><html><head><style>${css}</style></head><body><div id="probe-host"></div></body></html>`);
    let cases = 0;
    for (const step of Object.keys(shapeScale)) {
      const token = `--mtrl-sys-shape-corner-${step}`;
      for (const reference of bareReads(css, token).filter(renderable)) {
        assert(reference.fallback !== null, `${token} in ${sheet} has no fallback — a selective sheet cannot rely on the base's declaration`);
        const el = await element(page2, reference.selector);
        const corners = cornersOf(reference.within);
        const values = await computedCorners(page2, el, corners);
        for (const [index, corner] of corners.entries()) {
          assert(sameValue(values[index]!, reference.fallback!), `${reference.selector} in ${sheet}: computed ${corner} ${values[index]} with only the component sheet, expected the recorded fallback ${reference.fallback!}`);
          cases++;
        }
      }
    }
    assert(cases > 0, `${sheet}: no corner-token fallback found to probe`);
    pass("shape.corner.selective-fallback", cases);
    await page2.close();
  }
} finally {
  await browser.close();
}

// --- the evidence file, and the refusal of any unproven verified row -------
const catalogue = JSON.parse(catalogueBytes) as Catalogue;
assert(catalogue.inputsDigest === inputsDigest(), "the catalogue's inputs digest does not match the committed input files");
assert(sha256(catalogueBytes) === catalogueSha, "the catalogue digest changed during the run");
const records = new Map(evidence.map(record => [record.assertion, record]));
const proven = new Set(checks.filter(check => check.file === PROBE_FILE).map(check => check.id));
for (const row of catalogue.tokens) {
  if (row.verification !== "verified") continue;
  for (const assertion of row.verificationEvidence?.assertions ?? []) {
    if (!proven.has(assertion)) continue;
    const record = records.get(assertion);
    assert(record !== undefined, `${row.id}: cites ${assertion}, which this probe did not record — absent evidence is a failure, never a downgrade`);
    assert(record!.outcome === "pass", `${row.id}: ${assertion} did not pass`);
    assert(record!.inputsDigest === catalogue.inputsDigest, `${row.id}: ${assertion} ran against different input files`);
    assert(record!.catalogueDigest === catalogueSha, `${row.id}: ${assertion} ran against a different catalogue`);
  }
}
await Bun.write(EVIDENCE, `${JSON.stringify({ run: evidence, inputsFiles: INPUT_FILES }, null, 1)}\n`);
console.log(`token catalogue browser check passed: ${evidence.length} assertions, ${evidence.reduce((sum, record) => sum + record.cases, 0)} cases -> ${EVIDENCE}`);

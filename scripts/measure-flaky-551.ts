// Temporary shadow-menu focus evidence only. Extract the unchanged shadow-menu sequence
// from main, run it repeatedly in CI, and retain every result. Never merge.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const count = Number(process.env.FLO_551_ITERATIONS ?? "50");
assert(Number.isInteger(count) && count > 0 && count <= 200);
const source = await readFile("scripts/check-elements.ts", "utf8");
const start = source.indexOf("  // ---------------------------------------------------------------- menu in the top layer\n");
const end = source.indexOf("  // ---------------------------------------------------------------- FAB menu\n", start);
const setupEnd = source.indexOf("\ntry {\n  await checkDeclarativeUpgrade(browser);");
assert(start > 0 && end > start && setupEnd > 0, "Source boundaries must still identify exactly the original check");
const original = source.slice(start, end);
assert.equal((original.match(/for \(const shadow of \[true, false\]\)/g) ?? []).length, 1);
let selected = original.replace("for (const shadow of [true, false])", "for (const shadow of [true])");
selected = selected.replace("const openMenu = async (): Promise<void> => {", "const openMenu = async (): Promise<void> => {\n      openings++;");
const stressMarker = "      // A submenu: above the menu and the cover, the menu still open; Escape";
assert.equal(selected.split(stressMarker).length, 2, "Exactly one post-dismissal reopen must be stressed");
selected = selected.replace(stressMarker, `
      // Delay only this reopen's initial-focus task; keep the original 5s deadline.
      await page.evaluate(() => {
        const originalTimeout = window.setTimeout;
        const w = window as unknown as { __551Stress: Record<string, unknown>; __tl: { menu: { element: HTMLElement } } };
        const active = () => {
          let node = document.activeElement;
          while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
          return { tag: node?.localName, id: node?.id, inMenu: !!node && w.__tl.menu.element.contains(node) };
        };
        w.__551Stress = { injected: 0, extraDelayMs: 1500, beforeReopen: active() };
        window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
          if (delay !== 100 || typeof callback !== "function") return originalTimeout(callback, delay, ...args);
          window.setTimeout = originalTimeout;
          w.__551Stress.injected = 1;
          w.__551Stress.scheduledAt = performance.now();
          return originalTimeout(() => {
            w.__551Stress.beforeFocus = active();
            w.__551Stress.resumedAt = performance.now();
            callback(...args);
            w.__551Stress.afterFocus = active();
          }, delay + 1500);
        }) as typeof window.setTimeout;
      });
` + stressMarker);
const prelude = source.slice(0, setupEnd).replaceAll('from "./', 'from "../scripts/');
const selectedHash = createHash("sha256").update(original).digest("hex");
await mkdir("analysis/flaky-551", { recursive: true });
await writeFile("analysis/flaky-551/source.json", JSON.stringify({
  baseline: process.env.FLO_551_BASELINE, selectedHash, count,
  selection: "original top-layer block, shadow-root arm only; opening counter and one post-hidePopover initial-focus task delayed by 1500ms; assertions and original waits unchanged",
}, null, 2) + "\n");
const runner = `${prelude}
try {
  const page = await browser.newPage({viewport:{width:900,height:700}});
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(() => {
    const w = window as unknown as { __551Trace: unknown[] };
    w.__551Trace = [];
    const label = (node: Element | null) => node ? {tag:node.localName,id:node.id,class:node.getAttribute("class"),item:node.getAttribute("data-id")} : null;
    document.addEventListener("focusin", event => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      w.__551Trace.push({at:performance.now(),type:"focusin",target:label(event.composedPath()[0] as Element),active:label(active)});
    },true);
  });
  await page.goto("http://127.0.0.1:" + server.port);
  await page.waitForFunction(() => (window as unknown as Win).ready === true);
  const results: Array<Record<string, unknown>> = [];
  for (let iteration=1;iteration<=${count};iteration++) {
    const started = performance.now();
    const firstCheck = checks;
    let openings = 0;
    errors.length = 0;
    await page.evaluate(() => { (window as unknown as {__551Trace:unknown[]}).__551Trace = []; });
    let error: string | null = null;
    try {
${selected}
    } catch (caught) { error = caught instanceof Error ? caught.stack ?? caught.message : String(caught); }
    const snapshot = await page.evaluate(() => {
      const w = window as unknown as {__551Trace:unknown[];__551Stress?:Record<string,unknown>;__tl?:{menu:{element:HTMLElement;isOpen:()=>boolean};closes:number;root:Document|ShadowRoot}};
      const menu=w.__tl?.menu;
      let active=document.activeElement;
      while(active?.shadowRoot?.activeElement) active=active.shadowRoot.activeElement;
      return {stress:w.__551Stress,trace:w.__551Trace,active:active?.outerHTML,open:menu?.isOpen(),closes:w.__tl?.closes,menu:menu?.element.outerHTML,hasFocus:document.hasFocus()};
    });
    assert.equal(snapshot.stress?.injected,1,"The post-dismissal initial-focus task must be delayed exactly once");
    const result = {iteration,pass:error === null,ms:Math.round(performance.now()-started),openings,checks:checks-firstCheck,error,snapshot};
    results.push(result);
    await Bun.write("analysis/flaky-551/iteration-"+iteration+".json",JSON.stringify(result,null,2)+"\\n");
    console.log("SHADOW_MENU_ITERATION " + JSON.stringify({...result,snapshot:undefined}));
    await page.evaluate(() => {
      const w=window as unknown as {__tl?:{menu:{destroy:()=>void}}};
      w.__tl?.menu.destroy();
    });
  }
  const failures=results.filter(result=>!result.pass);
  const targetFailures=failures.filter(result=>String(result.error).includes("menu top layer in a shadow root: still waiting after 5s for the open menu to take focus"));
  const summary={baseline:process.env.FLO_551_BASELINE,head:process.env.GITHUB_SHA,selectedHash:"${selectedHash}",iterations:results.length,passes:results.length-failures.length,failures:failures.length,targetFailures:targetFailures.length,rate:targetFailures.length/results.length,stressExtraDelayMs:1500,totalOpenings:results.reduce((sum,result)=>sum+Number(result.openings),0),timingsMs:results.map(result=>result.ms)};
  await Bun.write("analysis/flaky-551/summary.json",JSON.stringify(summary,null,2)+"\\n");
  console.log("SHADOW_MENU_SUMMARY " + JSON.stringify(summary));
  assert.equal(results.length,${count});
  assert.equal(failures.length,targetFailures.length,"Unexpected failures are harness errors, not the selected focus timeout");
  for(const result of results.filter(result=>result.pass)) assert.equal(result.checks,6,"Every passing sequence must run all six original assertions");
} finally {
  await browser.close();
  server.stop(true);
}
`;
await writeFile("analysis/flaky-551-selected.ts", runner);
new Bun.Transpiler({ loader: "ts" }).transformSync(runner);
if (!process.argv.includes("--emit-only")) {
  const child = Bun.spawn([process.execPath, "analysis/flaky-551-selected.ts"], { stdout: "inherit", stderr: "inherit", env: process.env });
  process.exitCode = await child.exited;
}

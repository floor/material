// scripts/fixtures/ssr-observe.ts

// Firefox/WebKit do not all expose LayoutShift. Track the host, its rendered
// root and following siblings every frame as well as the native API when present.
// A host that opted out of SSR has no root until it upgrades, so its root appearing
// is not movement: what must stay put there is its server-rendered light children
// (`children`) and their roots. Once that root is there it is held to the place it
// first took, like any other.
const rendered = (host: Element) => Array.from(host.shadowRoot?.children ?? []).find(node => node.localName !== "style");
const box = (node: Element | undefined): number[] => {
  const r = node?.checkVisibility({ opacityProperty: true, visibilityProperty: true }) ? node.getBoundingClientRect() : undefined;
  return r ? [r.x, r.y, r.width, r.height] : [0, 0, 0, 0];
};
const boxes = (rooted: boolean, children: string) => {
  const host = document.querySelector("#stage > :first-child")!;
  const light = children ? Array.from(host.querySelectorAll(children)) : [];
  return [host, rooted ? rendered(host) : undefined, document.getElementById("following")!, ...light, ...light.map(rendered)].map(box);
};
const state = { nativeCLS: 0, nativeSupported: PerformanceObserver.supportedEntryTypes.includes("layout-shift"), maxGeometryDelta: 0, frames: 0 };
if (state.nativeSupported) new PerformanceObserver(list => {
  for (const entry of list.getEntries()) {
    const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!shift.hadRecentInput) state.nativeCLS += shift.value;
  }
}).observe({ type: "layout-shift" });
const api = {
  state,
  async observe(upgrade: () => Promise<unknown>, children = "") {
    const rooted = !!document.querySelector("#stage > :first-child")!.shadowRoot;
    const before = boxes(rooted, children);
    // The root of a host that had none: where it was in the first frame it showed.
    let appeared: number[] | undefined;
    const sample = () => {
      const after = boxes(rooted, children);
      state.maxGeometryDelta = Math.max(state.maxGeometryDelta, ...before.flatMap((box, i) => box.map((value, j) => Math.abs(value - after[i][j]))));
      if (!rooted) {
        const root = box(rendered(document.querySelector("#stage > :first-child")!));
        if (appeared) state.maxGeometryDelta = Math.max(state.maxGeometryDelta, ...appeared.map((value, j) => Math.abs(value - root[j])));
        else if (root.some(Boolean)) appeared = root;
      }
      state.frames++;
    };
    let loading = true;
    const duringLoad = () => { if (loading) { sample(); requestAnimationFrame(duringLoad); } };
    requestAnimationFrame(duringLoad);
    try { await upgrade(); } finally { loading = false; }
    sample();
    const start = performance.now();
    do { await new Promise(requestAnimationFrame); sample(); } while (performance.now() - start < 450);
  },
};
Object.assign(window, { ssrUpgrade: api });
export type UpgradeAPI = typeof api;

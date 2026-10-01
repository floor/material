// scripts/fixtures/ssr-observe.ts

// Firefox/WebKit do not all expose LayoutShift. Track the host, its rendered
// root and following siblings every frame as well as the native API when present.
const boxes = () => {
  const host = document.querySelector("#stage > :first-child")!;
  const root = Array.from(host.shadowRoot?.children ?? []).find(node => node.localName !== "style");
  return [host, root, document.getElementById("following")!].map(node => {
    const r = node?.checkVisibility({ opacityProperty: true, visibilityProperty: true }) ? node.getBoundingClientRect() : undefined;
    return r ? [r.x, r.y, r.width, r.height] : [0, 0, 0, 0];
  });
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
  async observe(upgrade: () => Promise<unknown>) {
    const before = boxes();
    const sample = () => {
      const after = boxes();
      state.maxGeometryDelta = Math.max(state.maxGeometryDelta, ...before.flatMap((box, i) => box.map((value, j) => Math.abs(value - after[i][j]))));
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

import assert from "node:assert/strict";
import type { ProgressComponent, ProgressConfig } from "../../src/components/progress/types";
import { createConformanceHarness, type Case } from "./measure";
import { fieldProperties,part,runFieldFixture } from "./field-fixture";

type Config={
  variant:NonNullable<ProgressConfig["variant"]>;
  shape:NonNullable<ProgressConfig["shape"]>;
  state:"determinate"|"indeterminate";
  direction:"ltr"|"rtl";
  value?:number;
  thickness?:ProgressConfig["thickness"];
  stop?:boolean;
  disabled?:boolean;
};

const mount:Case["mount"]=(mtrl,host,data)=>{
  const options=data as Config;
  const page=window as Window & { measuredProgress?:ProgressComponent };
  page.measuredProgress?.destroy();
  document.documentElement.dir=options.direction;
  host.style.cssText="width:min(360px,calc(100vw - 48px));min-height:80px";
  const create=mtrl.createProgress as unknown as (config:ProgressConfig)=>ProgressComponent;
  const progress=create({
    variant:options.variant,shape:options.shape,value:options.value ?? 50,
    indeterminate:options.state==="indeterminate",showLabel:false,
    thickness:options.thickness, showStopIndicator:options.stop,disabled:options.disabled,
    ariaLabel:"Upload",
  });
  host.append(progress.element);
  page.measuredProgress=progress;
};

const canvas=part("canvas",".mtrl-progress canvas");
const parts=[
  part("root",".mtrl-progress"),{...canvas,bitmap:true},
  part("progressbar",".mtrl-progress[role='progressbar'][aria-label='Upload']"),
  part("value",".mtrl-progress[aria-valuenow]"),
  part("disabled",".mtrl-progress[aria-disabled='true']"),
];
const cases:Case[]=[];
for(const variant of ["linear","circular"] as const)for(const shape of ["flat","wavy"] as const){
  const add=(id:string,custom:Partial<Config>,scheme:"light"|"dark"="light",density=0)=>{
    const config:Config={variant,shape,state:"determinate",direction:"ltr",...custom};
    cases.push({id:`${variant}/${shape}/${id}`,mount,config,parts,scheme,density,
      before:240,properties:[...fieldProperties,"transitionDuration"]});
  };
  for(const scheme of ["light","dark"] as const){
    add(`half/${scheme}`,{},scheme);
    add(`quarter/${scheme}`,{value:25},scheme);
    add(`indeterminate/${scheme}`,{state:"indeterminate"},scheme);
  }
  add("zero",{value:0});
  add("full",{value:100});
  add("rtl",{direction:"rtl"});
  add("no-stop",{stop:false});
  add("custom-thickness",{thickness:8});
  add("disabled",{disabled:true});
  for(const d of [-1,-2,-3])add(`density/${d}`,{},"light",d);
}
async function measureWaves() {
  const engine = process.argv.includes("--webkit") ? "webkit" : "chromium";
  const harness = await createConformanceHarness({ component: "progress", engine });
  try {
    const { records, flat } = await harness.page.evaluate(async () => {
      const create = (window as unknown as {mtrl: {
        createProgress: (config: ProgressConfig) => ProgressComponent;
      }}).mtrl.createProgress;
      const host = document.querySelector<HTMLElement>("#mount")!;
      host.style.width = "360px";
      const results = [];
      for (const config of [
        { variant: "linear", indeterminate: false, size: undefined },
        { variant: "linear", indeterminate: true, size: undefined },
        { variant: "circular", indeterminate: false, size: 40 },
        { variant: "circular", indeterminate: false, size: 48 },
      ] as const) {
        const progress = create({ ...config, shape: "wavy", value: 50 });
        host.replaceChildren(progress.element);
        const canvas = progress.element.querySelector("canvas")!;
        const context = canvas.getContext("2d")!;
        const moveTo = context.moveTo.bind(context);
        const lineTo = context.lineTo.bind(context);
        const stroke = context.stroke.bind(context);
        let points: [number, number][] = [];
        let path: [number, number][] = [];
        let cap = "";
        let width = 0;
        // Observe the coordinates sent to the live canvas before rasterisation
        // rounds the peaks. The original drawing calls still execute.
        context.moveTo = (x, y) => { points = [[x, y]]; moveTo(x, y); };
        context.lineTo = (x, y) => { points.push([x, y]); lineTo(x, y); };
        context.stroke = () => {
          if (points.length > 20 && (!config.indeterminate || points.length >= path.length)) {
            path = points;
            cap = context.lineCap;
            width = context.lineWidth;
          }
          points = [];
          stroke();
        };
        await new Promise(resolve => setTimeout(resolve, 900));
        const circular = config.variant === "circular";
        const cx = canvas.getBoundingClientRect().width / 2;
        const cy = canvas.getBoundingClientRect().height / 2;
        const positions = path.map(([x,y]) => circular ? Math.atan2(y-cy,x-cx) : x);
        const values = path.map(([x,y]) => circular ? Math.hypot(x-cx,y-cy) : y);
        const amplitude = (Math.max(...values)-Math.min(...values))/2;
        const radius = (Math.max(...values)+Math.min(...values))/2;
        const peaks: number[] = [];
        let offset = 0;
        for (let i = 1; i + 1 < values.length; i++) {
          if (circular && positions[i]! < positions[i-1]! - Math.PI) offset += 2*Math.PI;
          if (values[i]! <= values[i-1]! || values[i]! < values[i+1]!) continue;
          peaks.push(circular ? (positions[i]!+offset)*radius : positions[i]!);
        }
        const wavelength = peaks.length >= 2 ? (peaks.at(-1)!-peaks[0]!)/(peaks.length-1) : 0;
        progress.destroy();
        results.push({ ...config, amplitude, wavelength, cap, width, peaks: peaks.length });
      }
      const flat = [];
      for (const variant of ["linear", "circular"] as const) {
        const progress = create({ variant, shape: "flat", value: 50 });
        host.replaceChildren(progress.element);
        await new Promise(resolve => setTimeout(resolve, 250));
        const canvas = progress.element.querySelector("canvas")!;
        const context = canvas.getContext("2d")!;
        const begin = context.beginPath.bind(context);
        const move = context.moveTo.bind(context);
        const line = context.lineTo.bind(context);
        const arc = context.arc.bind(context);
        const stroke = context.stroke.bind(context);
        const fill = context.fill.bind(context);
        let segment: number[] = [];
        const paint: { width: number; cap: string; path: number[] }[] = [];
        let endpoint: number[] = [];
        context.beginPath = () => { segment = []; begin(); };
        context.moveTo = (x, y) => { segment = [x, y]; move(x, y); };
        context.lineTo = (x, y) => { segment.push(x, y); line(x, y); };
        context.arc = (x, y, radius, start, end, counterclockwise) => {
          segment = [x, y, radius, start, end];
          arc(x, y, radius, start, end, counterclockwise);
        };
        context.stroke = () => {
          paint.push({ width: context.lineWidth, cap: context.lineCap, path: segment });
          stroke();
        };
        context.fill = () => { if (segment.length === 5) endpoint = segment; fill(); };
        progress.setValue(49, false);
        paint.length = 0;
        progress.setValue(50, false);
        await new Promise(resolve => setTimeout(resolve, 180));
        const segments = paint.filter(p => p.path.length === (variant === "linear" ? 4 : 5));
        const [track, active] = segments.slice(-2);
        if (!active || !track) throw new Error(`Missing ${variant} canvas segments (${paint.length} captured strokes)`);
        const capInset = (active.width + track.width) / 2;
        const gap = variant === "linear"
          ? track.path[0]! - active.path[2]! - capInset
          : (track.path[3]! - active.path[4]!) * active.path[2]! - capInset;
        const drawingWidth = canvas.width / context.getTransform().a;
        flat.push({
          variant, activeThickness: active.width, trackThickness: track.width,
          activeCap: active.cap, trackCap: track.cap, gap,
          stopDiameter: endpoint.length ? endpoint[2]! * 2 : null,
          stopTrailing: endpoint.length ? drawingWidth - endpoint[0]! - endpoint[2]! : null,
        });
        progress.destroy();
      }
      return { records: results, flat };
    });
    assert.ok(records.every(row => row.peaks >= 2 && row.amplitude > 0), "A wavy path did not yield adjacent peaks");
    console.log(JSON.stringify({ source: harness.source, engine, records, flat }));
  } finally {
    await harness.close();
  }
}

if (process.argv.includes("--waves")) await measureWaves();
else await runFieldFixture("progress",cases,id=>[
  "root","canvas","progressbar",
  ...(id.includes("/indeterminate/")?[]:["value"]),
]);

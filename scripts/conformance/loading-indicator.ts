import assert from "node:assert/strict";
import type { LoadingIndicatorComponent,LoadingIndicatorConfig } from "../../src/components/loading-indicator/types";
import { createConformanceHarness,type Case } from "./measure";
import { fieldProperties,part,runFieldFixture } from "./field-fixture";

type Config={contained:boolean; value?:number; size?:number; direction:"ltr"|"rtl"};

const mount:Case["mount"]=(mtrl,host,data)=>{
  const config=data as Config;
  const page=window as Window & { measuredLoading?:LoadingIndicatorComponent };
  page.measuredLoading?.destroy();
  document.documentElement.dir=config.direction;
  const create=mtrl.createLoadingIndicator as unknown as (options:LoadingIndicatorConfig)=>LoadingIndicatorComponent;
  const indicator=create({contained:config.contained,value:config.value,size:config.size,ariaLabel:"Loading results"});
  host.append(indicator.element);
  page.measuredLoading=indicator;
};

const root=".mtrl-loading-indicator";
const parts=[
  part("root",root),{...part("canvas",root+" canvas"),bitmap:true},
  part("progressbar",root+"[role='progressbar'][aria-label='Loading results']"),
  part("value",root+"[aria-valuenow]"),
];
const cases:Case[]=[];
for(const contained of [false,true]){
  const add=(id:string,cfg:Partial<Config>,scheme:"light"|"dark"="light",density=0)=>{
    cases.push({
      id:`${contained?"contained":"default"}/${id}`,mount,config:{contained,direction:"ltr",...cfg} satisfies Config,
      parts,scheme,density,properties:fieldProperties,before:240,
    });
  };
  for(const scheme of ["light","dark"] as const){
    add(`indeterminate/${scheme}`,{},scheme);
    for(const value of [0,.25,.5,.75,1])add(`value-${value}/${scheme}`,{value},scheme);
  }
  for(const size of [24,64,96,240])add(`size-${size}`,{size});
  add("rtl",{direction:"rtl"});
  for(const density of [-1,-2,-3])add(`density/${density}`,{},"light",density);
}
async function measureFrames(){
  const engine=process.argv.includes("--webkit")?"webkit":"chromium";
  const reduced=process.argv.includes("--reduced-motion");
  const harness=await createConformanceHarness({component:"loading-indicator",engine});
  try{
    if(reduced)await harness.page.emulateMedia({reducedMotion:"reduce"});
    const frames=await harness.page.evaluate(async(reducedMotion)=>{
      const api=(window as unknown as {mtrl:{createLoadingIndicator: (c:LoadingIndicatorConfig)=>LoadingIndicatorComponent}}).mtrl;
      const indicator=api.createLoadingIndicator({ariaLabel:"Loading"});
      document.querySelector("#mount")!.append(indicator.element);
      const canvas=indicator.canvas;
      const ctx=canvas.getContext("2d")!;
      const fingerprints=new Set<string>();
      let farthest=0;
      const start=performance.now();
      let count=0;
      do {
        await new Promise(requestAnimationFrame);
        count++;
        const {width,height}=canvas;
        const image=ctx.getImageData(0,0,width,height).data;
        let hash=2166136261;
        for(let i=3;i<image.length;i+=4){
          const alpha=image[i]!;
          hash=Math.imul(hash^alpha,16777619);
          if(alpha<230)continue;
          const p=(i-3)/4;
          farthest=Math.max(farthest,Math.hypot(p%width+.5-width/2,Math.floor(p/width)+.5-height/2));
        }
        fingerprints.add(String(hash));
      } while(reducedMotion ? count<72 : performance.now()-start<4800);
      const diameter=2*farthest*canvas.getBoundingClientRect().width/canvas.width;
      indicator.destroy();
      return{frames:fingerprints.size,diameter,samples:count};
    },reduced);
    assert.ok(frames.diameter>0,"The indicator painted no opaque shape");
    console.log(JSON.stringify({engine,reduced,source:harness.source,...frames}));
  }finally{await harness.close();}
}
if(process.argv.includes("--frames"))await measureFrames();
else await runFieldFixture("loading-indicator",cases,id=>["root","canvas","progressbar",...(id.includes("/value-")?["value"]:[])]);

import type { BadgeComponent,BadgeConfig } from "../../src/components/badge/types";
import type { Case } from "./measure";
import { fieldProperties,part,runFieldFixture } from "./field-fixture";

type Config = {
  variant:"small"|"large";
  direction:"ltr"|"rtl";
  label?: string|number;
  max?:number;
  overlay?:boolean;
  hidden?:boolean;
  colour?:BadgeConfig["color"];
};

const mount:Case["mount"]=(mtrl,host,data)=>{
  const config=data as Config;
  const page=window as Window & { measuredBadge?:BadgeComponent };
  page.measuredBadge?.destroy();
  document.documentElement.dir=config.direction;
  host.style.cssText="padding:28px;position:relative;min-width:160px;min-height:72px";
  const create=mtrl.createBadge as unknown as (options:BadgeConfig)=>BadgeComponent;
  const icon=document.createElement("span");
  icon.id="badge-icon";
  icon.style.cssText="display:inline-block;width:24px;height:24px;position:relative";
  host.append(icon);
  const badge=create({variant:config.variant,label:config.label,max:config.max,color:config.colour,
    target:config.overlay?icon:undefined,visible:!config.hidden});
  if(!config.overlay) host.append(badge.element);
  page.measuredBadge=badge;
};

const common=[
  part("badge",".mtrl-badge"),part("target","#badge-icon"),
  part("overflow",".mtrl-badge--overflow"),part("hidden",".mtrl-badge--hidden"),
  part("status","[role='status']"),
  part("notification",".mtrl-badge[role='status'][aria-label='New notification']"),
];
const cases:Case[]=[];
for (const variant of ["small","large"] as const) {
  const add=(id:string,config:Partial<Config>,scheme:"light"|"dark"="light",density=0)=>{
    cases.push({id:`${variant}/${id}`,config:{variant,direction:"ltr",label:variant==="large"?5:undefined,...config} satisfies Config,
      mount,scheme,density,parts:common,properties:[...fieldProperties,"boxSizing","transitionDuration"]});
  };
  for (const scheme of ["light","dark"] as const) {
    add(`base/${scheme}`,{},scheme);
    add(`overlay/${scheme}`,{overlay:true},scheme);
  }
  add("overlay-rtl",{overlay:true,direction:"rtl"});
  if(variant==="large"){
    add("three-digit",{label:999});
    add("overflow",{label:1200,max:999});
    add("authored-wide",{label:"WWWW"});
  }
  add("hidden",{hidden:true});
  for(const density of [-1,-2,-3])add(`density/${density}`,{},"light",density);
  for(const colour of ["primary","secondary","tertiary","success","warning","info"] as const)add(`color/${colour}`,{colour});
}
await runFieldFixture("badge",cases,id=>id.endsWith("/hidden")?["target"]:["badge","target"]);

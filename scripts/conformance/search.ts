import type { SearchComponent, SearchConfig, SearchVariant } from "../../src/components/search/types";
import type { Case } from "./measure";
import { fieldProperties,interaction,part,runFieldFixture,type ReadState } from "./field-fixture";

type Data={variant:SearchVariant; view:"bar"|"docked"|"fullscreen"; direction:"ltr"|"rtl"; state:ReadState; avatar?:boolean; clickable?:boolean; empty?:boolean; noActions?:boolean; intrinsic?:boolean};

const mount:Case["mount"]=(mtrl,host,data)=>{
  const {variant,view,direction,state,avatar,clickable,empty,noActions,intrinsic}=data as Data;
  const page=window as Window & {conformanceSearch?:SearchComponent};
  page.conformanceSearch?.destroy();
  document.documentElement.dir=direction;
  host.style.width="420px";
  host.style.display="block";
  const icon='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const create=mtrl.createSearch as unknown as (config:SearchConfig)=>SearchComponent;
  const search=create({
    variant,viewMode:view==="fullscreen"?"fullscreen":"docked",
    disabled:state==="disabled", expandOnFocus:false,collapseOnBlur:false, fullWidth:!intrinsic, placeholder:"Search records",
    value:empty?"":"Notes",showClearButton:!empty&&!noActions,
    leadingIcon:icon,trailingItems:noActions?[]:[{id:"profile",content:avatar?"<span>A</span>":icon,type:avatar?"avatar":"icon",ariaLabel:"Profile",...(avatar&&clickable?{onClick:()=>{}}:{})}],
    suggestions:[{text:"Today",icon,supportingText:"Recent item",group:"Recent"},{text:"Saved",icon,group:"Recent"},{text:"All",icon,group:"Browse"}],
  });
  page.conformanceSearch=search;
  host.append(search.element);
  if(view!=="bar") search.expand();
  const input=search.element.querySelector<HTMLInputElement>(".mtrl-search__input");
  if(!input || input.disabled!==(state==="disabled") || search.isExpanded()!==(view!=="bar")) throw new Error("Search did not mount with the expected state");
};

const input=".mtrl-search__input";
const search=".mtrl-search";
const bar=".mtrl-search__container";
const parts = [
  part("input",input),part("root",search),part("header",bar),part("surface",".mtrl-search__surface"),part("backdrop",".mtrl-search__surface","::backdrop"),
  part("label",input,"::placeholder"),part("inputWrap",".mtrl-search__input-wrapper"),
  part("leading",".mtrl-search__leading-icon"),part("leadingGlyph",".mtrl-search__leading-icon svg"),
  part("trailing",".mtrl-search__trailing-icon"),part("trailingGlyph",".mtrl-search__trailing-icon svg"),
  part("clear",".mtrl-search__clear-button"),part("clearGlyph",".mtrl-search__clear-button svg"),
  part("avatar",".mtrl-search__avatar"),part("avatarGlyph",".mtrl-search__avatar > *"),
  part("divider",".mtrl-search__divider"),part("results",".mtrl-search__content"),
  part("suggestions",".mtrl-search__suggestions"),part("suggestion",".mtrl-search__suggestion-item"),
  part("suggestionIcon",".mtrl-search__suggestion-icon"),part("suggestionText",".mtrl-search__suggestion-text"),
  part("suggestionSupporting",".mtrl-search__suggestion-supporting"),
];

const cases:Case[]=[];
for(const variant of ["contained","divided"] as const) {
  const base:Data={variant,view:"bar",direction:"ltr",state:"rest",empty:true};
  const add=(id:string,config:Data,scheme:"light"|"dark"="light",density=0)=>{
    cases.push({
      id:`${variant}/${id}`,mount,config,scheme,density,properties:fieldProperties,before:config.view==="bar"?0:380,
      state:config.state,focusTarget:config.state==="focus"?input:undefined,
      parts:[...parts,...interaction("verifiedState",input,config.state)],
    });
  };
  for(const scheme of ["light","dark"] as const) {
    for(const state of ["rest","hover","focus","pressed","disabled"] as const) add(`bar/${scheme}/${state}`,{...base,state},scheme);
    for(const view of ["docked","fullscreen"] as const) add(`${view}/${scheme}/rest`,{...base,view,empty:false},scheme);
  }
  add("bar/light/avatar",{...base,avatar:true});
  add("bar/light/no-actions",{...base,noActions:true});
  add("bar/light/intrinsic",{...base,intrinsic:true});
  add("bar/light/populated",{...base,empty:false});
  for(const density of [-1,-2,-3]) add(`bar/density/${density}`,base,"light",density);
  add("bar/rtl",{...base,direction:"rtl"});
  add("docked/rtl",{...base,view:"docked",direction:"rtl",empty:false});
  add("docked/light/focus",{...base,view:"docked",empty:false,state:"focus"});
  if (variant === "contained") cases.push({
    id: "contained/bar/light/avatar-focus", mount,
    config: {...base, avatar: true, clickable: true, state: "focus"},
    state: "focus", focusTarget: ".mtrl-search__avatar", properties: fieldProperties,
    parts: [...parts, part("verifiedState", ".mtrl-search__avatar:focus-visible")],
  });
}
await runFieldFixture("search",cases,id=>["root","header","input","surface","leading","leadingGlyph",...(id.includes("/docked/")||id.includes("/fullscreen/")?["results","suggestion","suggestionText"]:[])]);

import type { SelectComponent, SelectConfig } from "../../src/components/select/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Data = { variant:"filled"|"outlined"; direction:"ltr"|"rtl"; state:ReadState; error?:boolean; compact?:boolean; popup?:boolean; top?:boolean; nearBottom?:boolean; long?:boolean };

const mount:Case["mount"] = (mtrl,host,data) => {
  const {variant,direction,state,error,compact,popup,top,nearBottom,long}=data as Data;
  const page=window as Window & {conformanceSelect?:SelectComponent};
  page.conformanceSelect?.destroy();
  document.documentElement.dir=direction;
  host.style.width="320px";
  host.style.display="block";
  if(nearBottom) {
    const spacer=document.createElement("div");
    spacer.style.height="495px";
    host.append(spacer);
  }
  const icon='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const options=Array.from({length:long?16:4},(_,index)=>({
    id:String(index),text:`Option ${index+1}`,icon,disabled:index===3,
  }));
  const create=mtrl.createSelect as unknown as (config:SelectConfig)=>SelectComponent;
  const select=create({
    options,value:popup?"1":undefined,variant,density:compact?"compact":"default",disabled:state==="disabled",
    required:true,label:"Country",supportingText:"Choose one option",error,layer:top?"top":undefined,
    menu:nearBottom?{container:document.body,maxHeight:"280px"}:undefined,
  });
  page.conformanceSelect=select;
  host.append(select.element);
  const input=select.textField.input;
  if(!input || input.disabled!==(state==="disabled") || input.getAttribute("role")!=="combobox") throw new Error("Select control did not mount with the requested state");
  if(popup) select.open("keyboard");
};

const input=".mtrl-select .mtrl-text-field__input";
const field=".mtrl-select .mtrl-text-field__field";
const popup=".mtrl-select__menu";
const option=popup+" .mtrl-menu__item[data-id='0']";
const parts=[
  part("input",input),part("root",".mtrl-select"),part("field",field),part("label",".mtrl-select .mtrl-text-field__label"),
  part("indicator",field,"::before"),part("outline",".mtrl-select .mtrl-text-field__outline-leading"),
  part("outlineEnd",".mtrl-select .mtrl-text-field__outline-trailing"),
  part("support",".mtrl-select .mtrl-text-field__supporting"),part("helper",".mtrl-select .mtrl-text-field__helper"),part("indicatorIcon",".mtrl-select .mtrl-text-field__trailing-icon svg"),
  part("trailing",".mtrl-select .mtrl-text-field__trailing-icon"),part("placeholder",input,"::placeholder"),
  part("popup",popup),part("option",option),part("layer",option,"::before"),part("optionIcon",option+" .mtrl-menu__item-icon"),
  part("selected",popup+" .mtrl-menu__item--selected"),part("disabledOption",popup+" .mtrl-menu__item--disabled"),
];
const cases:Case[]=[];
for(const variant of ["filled","outlined"] as const){
  const base:Data={variant,direction:"ltr",state:"rest"};
  const add=(id:string,config:Data,scheme:"light"|"dark"="light",density=0)=>{
    cases.push({
      id:`${variant}/${id}`,mount,config,scheme,density,properties:fieldProperties,
      before:config.popup?380:0,state:config.state,focusTarget:config.state==="focus"?input:undefined,
      parts:config.state==="hover"
        ? [part("hoverTarget",field),...parts,...interaction("verifiedState",field,"hover")]
        : [...parts,...interaction("verifiedState",input,config.state)],
    });
  };
  for(const scheme of ["light","dark"] as const) {
    for(const state of ["rest","hover","focus","disabled"] as const){
      add(`${scheme}/${state}`,{...base,state},scheme);
      if(state!=="disabled") add(`${scheme}/error-${state}`,{...base,state,error:true},scheme);
    }
    add(`${scheme}/popup`,{...base,popup:true},scheme);
  }
  for(const density of [-1,-2,-3]) add(`density/${density}`,base,"light",density);
  add("compact",{...base,compact:true});
  add("popup-rtl",{...base,popup:true,direction:"rtl"});
  add("popup-top",{...base,popup:true,top:true});
  add("popup-flip",{...base,popup:true,nearBottom:true,long:true});
}
await runFieldFixture("select",cases,id=>["root","field","input","label","helper","indicatorIcon",...(id.includes("popup")?["popup","option","selected","disabledOption"]:[])]);

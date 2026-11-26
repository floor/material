import type { TextFieldComponent, TextFieldConfig } from "../../src/components/text-field/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Data = { variant:"filled"|"outlined"; direction:"ltr"|"rtl"; state:ReadState; error?:boolean; compact?:boolean; populated?:boolean; multiline?:boolean; decorative?:boolean };

const mount: Case["mount"] = (mtrl,host,data) => {
  const {variant,direction,state,error,compact,populated,multiline,decorative} = data as Data;
  document.documentElement.dir = direction;
  host.style.width = "360px";
  host.style.display = "block";
  const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const create = mtrl.createTextField as unknown as (config:TextFieldConfig)=>TextFieldComponent;
  const field = create({
    variant, type:multiline?"multiline":"text", density:compact?"compact":"default",
    label:"Email address", placeholder:"name@example.com", supportingText:"Enter a valid address",
    error, disabled:state==="disabled", value:populated?"example@site.com":undefined,
    leadingIcon:icon, trailingIcon:icon, trailingIconLabel:decorative?undefined:"Clear",
    prefixText:"+", suffixText:".com", maxLength:30, required:true,
  });
  host.append(field.element);
  const input = field.element.querySelector<HTMLInputElement|HTMLTextAreaElement>(".mtrl-text-field__input");
  if (!input || input.disabled !== (state==="disabled") || !input.required) throw new Error("Incorrect field state");
};

const input=".mtrl-text-field__input";
const field=".mtrl-text-field__field";
const parts = [
  part("input",input), part("field",field), part("root",".mtrl-text-field"),
  part("indicator",field,"::before"), part("label",".mtrl-text-field__label"),
  part("placeholder",input,"::placeholder"),part("outline",".mtrl-text-field__outline-leading"),
  part("outlineEnd",".mtrl-text-field__outline-trailing"),part("notch",".mtrl-text-field__outline-notch"),
  part("helper",".mtrl-text-field__helper"),part("counter",".mtrl-text-field__counter"),part("support",".mtrl-text-field__supporting"),
  part("leading",".mtrl-text-field__leading-icon"),part("leadingIcon",".mtrl-text-field__leading-icon svg"),
  part("trailing",".mtrl-text-field__trailing-icon"),part("trailingTarget",".mtrl-text-field__trailing-icon","::after"),part("trailingIcon",".mtrl-text-field__trailing-icon svg"),
  part("prefix",".mtrl-text-field__prefix"),part("suffix",".mtrl-text-field__suffix"),part("required",".mtrl-text-field__required"),
];
const cases: Case[] = [];
for (const variant of ["filled","outlined"] as const) {
  const base:Data = {variant,direction:"ltr",state:"rest"};
  const add = (id:string, config:Data, scheme:"light"|"dark"="light",density=0) => cases.push({
    id:`${variant}/${id}`,mount,config,scheme,density,state:config.state,
    focusTarget:config.state==="focus"?input:undefined, properties:fieldProperties,
    parts:[...parts,...interaction("verifiedState",input,config.state)],
  });
  for (const scheme of ["light","dark"] as const) {
    for (const state of ["rest","hover","focus","disabled"] as const) {
      add(`${scheme}/${state}`,{...base,state},scheme);
      if (state!=="disabled") add(`${scheme}/error-${state}`,{...base,state,error:true},scheme);
    }
    add(`${scheme}/populated`,{...base,populated:true},scheme);
  }
  for (const density of [-1,-2,-3]) add(`density/${density}`,base,"light",density);
  add("compact",{...base,compact:true});
  add("rtl",{...base,direction:"rtl"});
  add("multiline",{...base,multiline:true,populated:true});
  add("decorative",{...base,decorative:true});
  const target=".mtrl-text-field__trailing-icon--button";
  cases.push({
    id:`${variant}/trailing-focus`,mount,config:base,state:"focus",focusTarget:target,
    properties:fieldProperties,parts:[...parts,part("verifiedState",target+":focus-visible")],
  });
}
await runFieldFixture("text-field",cases,id=>["root","field","input","label","helper","leadingIcon","trailingIcon",...(id.startsWith("outlined")?["outline","notch"]:[])]);

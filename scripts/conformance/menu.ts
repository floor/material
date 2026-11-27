import type { MenuComponent, MenuConfig, MenuContent } from "../../src/components/menu/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = { variant: "baseline" | "vertical"; color:"standard"|"vibrant"; direction:"ltr"|"rtl"; state:ReadState; selected?:boolean; grouped?:boolean; compact?:boolean; top?:boolean; submenu?:boolean; firstItemSupportingText?:boolean };

const mount: Case["mount"] = (mtrl,host,data) => {
  const {variant,color,direction,state,selected,grouped,compact,top,firstItemSupportingText} = data as Config;
  const page = window as Window & { conformanceMenu?:MenuComponent };
  page.conformanceMenu?.destroy();
  document.documentElement.dir = direction;
  host.style.width = "400px";
  const opener = document.createElement("button");
  opener.id="menu-opener";
  opener.textContent="Actions";
  host.append(opener);
  const icon='<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const items:MenuContent[] = [
    {id:"a",text:"First",icon,shortcut:"⌘A",disabled:state==="disabled",supportingText:firstItemSupportingText?"Extra context":undefined},
    {id:"b",text:"Second",icon,supportingText:"Extra context"},
    {id:"c",text:"Third",icon},
    grouped ? {type:"gap"} : {type:"divider"},
    {id:"d",text:"Fourth",icon,hasSubmenu:true, submenu:[{id:"child",text:"Child"}]},
    {id:"e",text:"Last",icon},
  ];
  const create=mtrl.createMenu as unknown as (config:MenuConfig)=>MenuComponent;
  const menu=create({opener,variant,color,items,width:"240px",offset:8,dense:compact,openSubmenuOnHover:true,layer:top?"top":undefined});
  page.conformanceMenu=menu;
  if (selected) menu.setSelected("a");
  if (state==="focus") opener.focus();
  else menu.open(undefined,"mouse");
};

const menu=".mtrl-menu:not(.mtrl-menu--submenu)";
const item=".mtrl-menu__item[data-id='a']";
const parts = [
  part("item",item),part("root",menu),part("opener","#menu-opener"),part("childMenu",".mtrl-menu--submenu"),
  part("layer",item,"::before"),part("trailingCheck",item,"::after"),part("selectedMark",`${item} .mtrl-menu__item-checkmark`),
  part("icon",`${item} .mtrl-menu__item-icon`),part("label",`${item} .mtrl-menu__item-text`),
  part("iconSvg",`${item} .mtrl-menu__item-icon svg`),part("itemSupport",`${item} .mtrl-menu__item-supporting`),
  part("shortcut",`${item} .mtrl-menu__item-shortcut`),
  part("support",".mtrl-menu__item[data-id='b'] .mtrl-menu__item-supporting"),
  part("second",".mtrl-menu__item[data-id='b']"),part("third",".mtrl-menu__item[data-id='c']"),part("last",".mtrl-menu__item[data-id='e']"),
  part("submenu",".mtrl-menu__item[data-id='d']"),part("divider",".mtrl-menu__divider"),part("group",".mtrl-menu__group"),
  part("groupList",".mtrl-menu__group > ul"),
  part("submenuArrow",".mtrl-menu__item[data-id='d']","::after"),
];

const cases:Case[]=[];
for (const [name,variant,color,grouped] of [
  ["baseline","baseline","standard",false],["standard","vertical","standard",false],
  ["vibrant","vertical","vibrant",false],["segmented","vertical","standard",true],
] as const) {
  const base:Config={variant,color,grouped,direction:"ltr",state:"rest"};
  const add=(id:string,config:Config,scheme:"light"|"dark"="light",density=0)=>{
    const state=config.state;
    const check=config.submenu ? [part("verifiedState",".mtrl-menu--submenu .mtrl-menu__item")] : state==="focus" ? [part("verifiedState",item+":is(:focus-visible,.mtrl-menu__item--keyboard-active,.mtrl-menu__item--active)")] :
      state==="disabled" ? [part("verifiedState",item+".mtrl-menu__item--disabled")] : interaction("verifiedState",item,state);
    cases.push({id:`${name}/${id}`,mount,config,scheme,density,before:300,
      state:state==="focus"?"rest":state,keys:state==="focus"?["ArrowDown"]:undefined,
      properties:[...fieldProperties,"maxWidth"],parts:config.submenu?[part("hoverTarget",".mtrl-menu__item[data-id='d']"),...parts,...check]:[...parts,...check],
    });
  };
  for (const scheme of ["light","dark"] as const) for (const selected of [false,true]) {
    for (const state of ["rest","hover","focus","pressed","disabled"] as const) {
      add(`${scheme}/${selected ? "selected":"unselected"}/${state}`,{...base,state,selected},scheme);
    }
  }
  if (name==="standard" || name==="vibrant") {
    for (const selected of [false,true]) {
      for (const state of ["rest","hover","focus","pressed","disabled"] as const) {
        add(`coverage/${selected?"selected":"unselected"}/${state}`,{...base,state,selected,firstItemSupportingText:true});
      }
    }
  }
  for (const density of [-1,-2,-3]) add(`density/${density}`,base,"light",density);
  add("rtl",{...base,direction:"rtl"});
  add("compact",{...base,compact:true});
  add("top-layer",{...base,top:true});
  if(variant==="vertical") add("submenu-active",{...base,state:"hover",submenu:true});
}
await runFieldFixture("menu",cases,id=>["root","opener","item","icon","label",...(id.startsWith("segmented")?["group"]:["divider"]),...(id.endsWith("submenu-active")?["childMenu"]:[])]);

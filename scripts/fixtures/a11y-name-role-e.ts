import createButton from '../../src/components/button';
import {createChips, createInputChip} from '../../src/components/chips';
import createCarousel from '../../src/components/carousel';
import createCard, {createCardActions,createCardContent,createCardHeader,createCardMedia} from '../../src/components/card';
import {defineButton} from '../../src/elements/button';
import {defineChips} from '../../src/elements/chips';
import {defineCarousel} from '../../src/elements/carousel';
import {defineCard} from '../../src/elements/card';
import {registerStyles, hasStyles} from '../../src/elements/styles';

const css = await fetch('/shadow-styles.json').then(response => response.json()) as Record<string,string>;
registerStyles(css);
for (const name of ['ripple','button','progress','chips','card','carousel']) {
  if (!hasStyles(name) || !css[name].includes('.mtrl-')) throw new Error(`Missing real shadow CSS: ${name}`);
}
defineButton(); defineChips(); defineCarousel(); defineCard();
const mount = <T extends {element:HTMLElement}>(id:string, component:T):T => {
  component.element.id = id;
  document.querySelector('#stage')!.append(component.element);
  return component;
};
const chip = mount('chip-factory', createInputChip({label:'React'}));
mount('chip-explicit', createInputChip({label:'Visible',ariaLabel:'Framework'}));
mount('chip-set-factory', createChips({chips:[{type:'input',label:'Vue',value:'vue'}]}));
const loading = mount('button-loading-api', createButton({text:'Submit API',progress:true}));
mount('carousel-factory', createCarousel({ariaLabel:'Featured factory',slides:[
  {title:'Mountain',content:'<p>Slide one content</p>'},{title:'Ocean',content:'<p>Slide two content</p>'}
]}));
mount('card-header', createCard({header:{title:'Project Alpha'},content:{text:'Summary'}}));
mount('card-interactive', createCard({interactive:true,header:{title:'Hover card'}}));
const primary=mount('card-clickable', createCard({clickable:true,header:{title:'Open item'}}));
const activation={primary:0,card:0,action:0};
primary.on('click',()=>activation.primary++);
const detail=createButton({text:'Details'});
detail.on('click',()=>activation.action++);
const withActions=mount('card-actions', createCard({clickable:true,header:{title:'Card with actions'},actions:{actions:[detail.element]}}));
withActions.on('click',()=>activation.card++);
mount('card-buttons', createCard({clickable:true,header:{title:'Button shorthand card'},buttons:[{text:'Shorthand detail'}]}));
const html = `<m-chips id="chip-element" aria-label="Skills"><m-chip variant="input" value="react">React element</m-chip></m-chips>
<m-button id="button-element">Submit element</m-button>
<m-carousel id="carousel-element" aria-label="Featured element" style="width:600px;height:220px"><m-carousel-item label="Mountain">Slide one</m-carousel-item><m-carousel-item label="Ocean">Slide two</m-carousel-item></m-carousel>
<m-card id="card-element-header" headline="Element headline">Summary</m-card>
<m-card id="card-element-clickable" clickable headline="Clickable attribute">Summary</m-card>
<m-card id="card-element-actions" clickable headline="Actions card"><m-button slot="actions">Details element</m-button></m-card>`;
document.querySelector('#stage')!.insertAdjacentHTML('beforeend',html);
await loading.setLoading?.(true);
const exerciseWarning = (part:string,clickable=true) => {
  const card=createCard({clickable,header:{title:'Dynamic card'}});
  document.querySelector('#stage')!.append(card.element);
  const button=document.createElement('button');
  button.textContent='Dynamic action';
  if(part==='header')card.setHeader(createCardHeader({title:'Dynamic card',action:button}));
  else if(part==='content')card.addContent(createCardContent({children:[button]}));
  else if(part==='media')card.addMedia(createCardMedia({element:button}));
  else card.setActions(createCardActions({actions:[button]}));
  const result={role:card.element.getAttribute('role'),tabIndex:card.element.tabIndex,action:button.outerHTML};
  card.destroy();
  return result;
};
Object.assign(window, {mtrlE:{chip,loading,activation,exerciseWarning,cssNames:Object.keys(css)},ready:true});

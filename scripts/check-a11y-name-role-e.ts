/**
 * Patch (e): input-chip names and development-only diagnostics for nested card actions.
 * Real shadow CSS is registered and asserted before CDP exposes the full subtrees.
 * Sources read 2026-11-08: https://m3.material.io/components/chips/accessibility
 * https://m3.material.io/components/cards/accessibility
 * A18 default nested-action behavior remains open; no automatic normalization.
 */
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import * as sass from 'sass';
import {componentStyles} from './style-manifest';
const options = {loadPaths:[resolve('src/styles')],logger:sass.Logger.silent};
const css:Record<string,string> = {};
for (const name of ['button','progress','chips','card','carousel']) css[name]=sass.compileString(`@use "${componentStyles[name].source}";`,options).css;
css.ripple=sass.compileString('@use "utilities/ripple";',options).css;
const full=sass.compile('src/styles/main.scss',{logger:sass.Logger.silent}).css;
const built=await Bun.build({entrypoints:['scripts/fixtures/a11y-name-role-e.ts'],target:'browser',define:{'process.env.NODE_ENV':JSON.stringify('development')}});
assert(built.success,String(built.logs));
const js=await built.outputs[0].text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch(request){
  const path=new URL(request.url).pathname;
  if(path==='/app.js') return new Response(js,{headers:{'Content-Type':'text/javascript'}});
  if(path==='/shadow-styles.json') return Response.json(css);
  if(path==='/styles.css') return new Response(full,{headers:{'Content-Type':'text/css'}});
  return new Response('<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"><style>#stage{display:grid;gap:24px}#carousel-factory,m-carousel{width:600px;height:220px}</style></head><body><main id="stage"></main><script type="module" src="/app.js"></script></body></html>',{headers:{'Content-Type':'text/html'}});
}});
type Ax={nodeId:string;backendDOMNodeId?:number;ignored?:boolean;role?:{value:string};name?:{value:string};properties?:{name:string;value:{value:unknown}}[];childIds?:string[]};
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:1200},reducedMotion:'reduce'});
  const errors:string[]=[];
  const warnings:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(message.type()!=='warning')return;
    if(message.text().includes('has no CSS'))errors.push(message.text());
    if(message.text().startsWith('[mtrl] card:'))warnings.push(message.text());
  });
  // Match the library's existing development-warning environment contract.
  await page.addInitScript(()=>Object.assign(window,{process:{env:{NODE_ENV:'development'}}}));
  await page.goto(server.url.href);
  await page.waitForFunction(()=>Reflect.get(window,'ready')===true);
  assert.deepEqual(errors,[]);
  const styles=await page.evaluate(()=>{
    return ['chip-element','button-element','carousel-element','card-element-header'].map(id=>{
      const host=document.getElementById(id)!;
      const shadow=host.shadowRoot!;
      const sheets=Array.from(shadow.adoptedStyleSheets);
      const rules=sheets.flatMap(sheet=>Array.from(sheet.cssRules,rule=>rule.cssText));
      const control=shadow.firstElementChild!;
      return {id,sheets:sheets.length,characters:rules.join('').length,display:getComputedStyle(control).display};
    });
  });
  for(const style of styles){assert(style.sheets>=3,JSON.stringify(style));assert(style.characters>1000,JSON.stringify(style));assert.notEqual(style.display,'inline',JSON.stringify(style));}
  console.log('Real shadow stylesheet assertions:',JSON.stringify(styles));
  const client=await page.context().newCDPSession(page);
  await client.send('Accessibility.enable');
  const {nodes}=await client.send('Accessibility.getFullAXTree') as {nodes:Ax[]};
  const expressions:Record<string,string>={
    'chip-factory':`document.querySelector('#chip-factory')`,
    'chip-explicit':`document.querySelector('#chip-explicit')`,
    'chip-set-factory':`document.querySelector('#chip-set-factory')`,
    'chip-element':`document.querySelector('#chip-element').shadowRoot.querySelector('.mtrl-chips')`,
    'button-loading-api':`document.querySelector('#button-loading-api')`,
    'button-element':`document.querySelector('#button-element').shadowRoot.querySelector('button')`,
    'carousel-factory':`document.querySelector('#carousel-factory')`,
    'carousel-element':`document.querySelector('#carousel-element').shadowRoot.querySelector('.mtrl-carousel')`,
    'card-header':`document.querySelector('#card-header')`,
    'card-interactive':`document.querySelector('#card-interactive')`,
    'card-clickable':`document.querySelector('#card-clickable')`,
    'card-actions':`document.querySelector('#card-actions')`,
    'card-buttons':`document.querySelector('#card-buttons')`,
    'card-element-header':`document.querySelector('#card-element-header').shadowRoot.querySelector('.mtrl-card')`,
    'card-element-clickable':`document.querySelector('#card-element-clickable').shadowRoot.querySelector('.mtrl-card')`,
    'card-element-actions':`document.querySelector('#card-element-actions').shadowRoot.querySelector('.mtrl-card')`,
  };
  const byId=new Map(nodes.map(node=>[node.nodeId,node]));
  const reports:Record<string,unknown>={};
  for(const [id,expression] of Object.entries(expressions)){
    const evaluated=await client.send('Runtime.evaluate',{expression,returnByValue:false});
    assert(evaluated.result.objectId,`Missing fixture ${id}`);
    const described=await client.send('DOM.describeNode',{objectId:evaluated.result.objectId});
    const root=nodes.find(node=>node.backendDOMNodeId===described.node.backendNodeId);
    assert(root,`Missing AX node ${id}`);
    const tree:unknown[]=[];
    const visit=(node:Ax):void=>{
      if(!node.ignored) tree.push({role:node.role?.value,name:node.name?.value,properties:Object.fromEntries((node.properties??[]).map(p=>[p.name,p.value.value]))});
      for(const child of node.childIds??[]){const next=byId.get(child);if(next)visit(next);}
    };
    visit(root);
    const serialized=await client.send('Runtime.callFunctionOn',{objectId:evaluated.result.objectId,functionDeclaration:'function(){return this.outerHTML;}',returnByValue:true});
    const html=String(serialized.result.value);
    reports[id]={tree,html};
    console.log(id,JSON.stringify(tree));
  }
  const failures:string[]=[];
  let checks=0;
  const check=(id:string,condition:boolean):void=>{checks++;if(!condition)failures.push(id);};
  type Summary={tree:{role:string;name:string;properties:Record<string,unknown>}[];html:string};
  const report=(id:string)=>reports[id] as Summary;
  for(const id of ['chip-factory','chip-explicit']) {
    check(id+'-wrapper-name',report(id).tree[0].role==='group'&&report(id).tree[0].name==='');
    check(id+'-primary-name',report(id).tree.some(node=>node.role==='checkbox'&&node.name===(id==='chip-factory'?'React':'Framework')));
    check(id+'-remove-name',report(id).tree.some(node=>node.role==='button'&&node.name===(id==='chip-factory'?'Remove React':'Remove Visible')));
  }
  for(const [id,label] of [['chip-set-factory','Vue'],['chip-element','React element']]) {
    check(id+'-selection-name',report(id).tree.some(node=>node.role==='checkbox'&&node.name===label));
    check(id+'-remove-name',report(id).tree.some(node=>node.role==='button'&&node.name==='Remove '+label));
  }
  for(const id of ['card-actions','card-buttons','card-element-actions']) {
    check(id+'-default-preserved',report(id).tree[0].role==='button'&&report(id).tree[0].properties.focusable===true);
    check(id+'-child-action',report(id).tree.some(node=>node.role==='button'&&/Details|detail/.test(node.name)));
  }
  check('card-development-warning',warnings.length===3&&warnings.every(warning=>warning.includes('https://m3.material.io/components/cards/accessibility')));
  for(const part of ['header','content','media','actions']) {
    const before=warnings.length;
    const dynamic=await page.evaluate(part=>Reflect.get(window,'mtrlE').exerciseWarning(part),part);
    await page.waitForTimeout(20);
    check('card-'+part+'-warning',warnings.length===before+1);
    check('card-'+part+'-dom-preserved',dynamic.role==='button'&&dynamic.tabIndex===0&&dynamic.action==='<button>Dynamic action</button>');
  }
  const beforePlain=warnings.length;
  await page.evaluate(()=>Reflect.get(window,'mtrlE').exerciseWarning('actions',false));
  await page.waitForTimeout(20);
  check('card-container-no-warning',warnings.length===beforePlain);
  // Correct current APIs and semantics remain controls, not additional fixes.
  check('loading-api-state',report('button-loading-api').tree[0].properties.busy===1&&report('button-loading-api').tree[0].properties.disabled===true);
  check('card-header-name',report('card-header').tree[0].name==='Project Alpha');
  check('card-style-only',report('card-interactive').tree[0].role==='article'&&!report('card-interactive').tree[0].properties.focusable);
  check('card-primary-action',report('card-clickable').tree[0].role==='button'&&report('card-clickable').tree[0].properties.focusable===true);
  // Record the unresolved A18 behavior without asserting it as a desired contract.
  await page.locator('#card-actions button').focus();
  await page.keyboard.press('Enter');
  const openA18=await page.evaluate(()=>Reflect.get(window,'mtrlE').activation as {primary:number;card:number;action:number});
  console.log('Open A18 nested Enter diagnostic:',JSON.stringify(openA18));
  await page.locator('#card-clickable').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  check('card-primary-keyboard',await page.evaluate(()=>Reflect.get(window,'mtrlE').activation.primary===2));
  const author=await page.evaluate(()=>{
    const host=document.querySelector('#card-element-actions')!;
    const chip=Reflect.get(window,'mtrlE').chip as {element:HTMLElement;setLabel:(text:string)=>unknown};
    chip.element.setAttribute('aria-label','Authored group');
    chip.setLabel('Renamed token');
    return {group:chip.element.getAttribute('aria-label'),native:host.getAttribute===Element.prototype.getAttribute,clickable:host.hasAttribute('clickable'),selector:host.matches('[clickable]'),serialized:host.outerHTML.includes('clickable'),name:host.getAttribute('headline')};
  });
  check('chip-authored-group',author.group==='Authored group');
  check('author-native-contract',author.native&&author.clickable&&author.selector&&author.serialized&&author.name==='Actions card');
  const production=await Bun.build({entrypoints:['src/components/card/index.ts'],target:'browser',minify:true,define:{'process.env.NODE_ENV':JSON.stringify('production')}});
  assert(production.success,String(production.logs));
  check('card-production-warning-stripped',!(await production.outputs[0].text()).includes('https://m3.material.io/components/cards/accessibility'));
  console.log('Card development warnings:',JSON.stringify(warnings));
  console.log('Semantic checks:',checks);
  console.log('Expected semantic failures:',JSON.stringify(failures));
  const output=process.argv[2];
  if(output)await writeFile(output,JSON.stringify({styles,reports,warnings,checks,openA18,failures},null,2)+'\n');
  assert.deepEqual(failures,[],`${failures.length} semantic scenarios failed`);
}finally{await browser.close();server.stop(true);}

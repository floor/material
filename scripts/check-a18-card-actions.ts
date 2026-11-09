/**
 * A18: a clickable card may opt into child actions (`promoteChildActions` /
 * `promote-child-actions`). The card is then an article container, not a button.
 * Red when the option is absent: those cards stay role button, keep a tab stop,
 * warn, and Enter on a child activates the card.
 * Source read 2026-11-09: https://m3.material.io/components/cards/accessibility
 * A card is a non-actionable container that holds buttons or links, or it is
 * directly actionable with none. An action is not placed on an actionable surface.
 */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import * as sass from 'sass';
import {componentStyles} from './style-manifest';

const options = {loadPaths: [resolve('src/styles')], logger: sass.Logger.silent};
const css: Record<string, string> = {};
for (const name of ['button', 'progress', 'card']) {
  css[name] = sass.compileString(`@use "${componentStyles[name].source}";`, options).css;
}
css.ripple = sass.compileString('@use "utilities/ripple";', options).css;
const built = await Bun.build({
  entrypoints: ['scripts/fixtures/a18-card-actions.ts'],
  target: 'browser',
  define: {'process.env.NODE_ENV': JSON.stringify('development')},
});
assert(built.success, String(built.logs));
const js = await built.outputs[0].text();
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/app.js') return new Response(js, {headers: {'Content-Type': 'text/javascript'}});
    if (path === '/shadow-styles.json') return Response.json(css);
    return new Response(
      '<!doctype html><html data-theme="baseline"><head></head><body><main id="stage"></main><script type="module" src="/app.js"></script></body></html>',
      {headers: {'Content-Type': 'text/html'}},
    );
  },
});

type Ax = {
  nodeId: string;
  backendDOMNodeId?: number;
  ignored?: boolean;
  role?: {value: string};
  name?: {value: string};
  properties?: {name: string; value: {value: unknown}}[];
  childIds?: string[];
};

const cards = [
  ['card-actions-promoted', 'Promoted card with actions', 'Promoted detail'],
  ['card-buttons-promoted', 'Promoted shorthand card', 'Promoted shorthand detail'],
  ['card-element-actions-promoted', 'Promoted element card', 'Promoted element detail'],
] as const;

const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() !== 'warning') return;
    if (message.text().includes('has no CSS')) errors.push(message.text());
    if (message.text().startsWith('[mtrl] card:')) warnings.push(message.text());
  });
  await page.addInitScript(() => Object.assign(window, {process: {env: {NODE_ENV: 'development'}}}));
  await page.goto(server.url.href);
  await page.waitForFunction(() => Reflect.get(window, 'ready') === true);
  await page.waitForFunction(() => {
    const text = (id: string) => document.getElementById(id)?.textContent ?? '';
    return text('card-actions-promoted').includes('Promoted detail')
      && text('card-buttons-promoted').includes('Promoted shorthand detail')
      && text('card-element-actions-promoted').includes('Promoted element detail');
  });
  await page.waitForTimeout(20);
  assert.deepEqual(errors, []);

  const dom = await page.evaluate(() => {
    const read = (element: Element | null) => ({
      role: element?.getAttribute('role') ?? null,
      tabIndex: (element as HTMLElement | null)?.tabIndex ?? null,
      tabindex: element?.getAttribute('tabindex') ?? null,
    });
    const inner = (id: string) => id.startsWith('card-element')
      ? document.getElementById(id)?.shadowRoot?.querySelector('.mtrl-card') ?? null
      : document.getElementById(id);
    return Object.fromEntries(['card-actions-promoted', 'card-buttons-promoted', 'card-element-actions-promoted'].map(id => [id, read(inner(id))]));
  }) as Record<string, {role: string | null; tabIndex: number | null; tabindex: string | null}>;

  const client = await page.context().newCDPSession(page);
  await client.send('Accessibility.enable');
  const {nodes} = await client.send('Accessibility.getFullAXTree') as {nodes: Ax[]};
  const byId = new Map(nodes.map(node => [node.nodeId, node]));
  const reports: Record<string, {role?: string; name?: string; buttons: string[]}> = {};
  for (const [id] of cards) {
    const expression = id.startsWith('card-element')
      ? `document.querySelector('#${id}').shadowRoot.querySelector('.mtrl-card')`
      : `document.querySelector('#${id}')`;
    const evaluated = await client.send('Runtime.evaluate', {expression, returnByValue: false});
    assert(evaluated.result.objectId, `Missing fixture ${id}`);
    const described = await client.send('DOM.describeNode', {objectId: evaluated.result.objectId});
    const root = nodes.find(node => node.backendDOMNodeId === described.node.backendNodeId);
    assert(root, `Missing AX node ${id}`);
    const buttons: string[] = [];
    const visit = (node: Ax): void => {
      if (node !== root && !node.ignored && node.role?.value === 'button' && node.name?.value) buttons.push(node.name.value);
      for (const child of node.childIds ?? []) {
        const next = byId.get(child);
        if (next) visit(next);
      }
    };
    visit(root);
    reports[id] = {role: root.role?.value, name: root.name?.value, buttons};
    console.log(id, JSON.stringify(reports[id]), JSON.stringify(dom[id]));
  }

  const failures: string[] = [];
  let checks = 0;
  const check = (id: string, condition: boolean): void => {
    checks++;
    if (!condition) failures.push(id);
  };
  check('promoted-cards-silent', warnings.length === 0);
  for (const [id, name, button] of cards) {
    check(`${id}-article`, reports[id].role === 'article' && reports[id].name === name);
    check(`${id}-dom`, dom[id].role === 'article' && dom[id].tabIndex === -1 && dom[id].tabindex === null);
    check(`${id}-child`, reports[id].buttons.includes(button));
  }
  await page.locator('#card-actions-promoted button').focus();
  await page.keyboard.press('Enter');
  const promoted = await page.evaluate(() => Reflect.get(window, 'mtrlA18').promotedActivation as {card: number; action: number});
  console.log('Promoted Enter:', JSON.stringify(promoted));
  check('promoted-enter', promoted.card === 0 && promoted.action === 1);
  await page.locator('#card-promoted-plain .mtrl-card__header-title').click();
  await page.locator('#card-promoted-plain .mtrl-card__content').click();
  await page.locator('#card-promoted-plain').focus();
  await page.keyboard.press('Enter');
  const plain = await page.evaluate(() => {
    const element = document.getElementById('card-promoted-plain');
    const card = Reflect.get(window, 'mtrlA18').plainActivation.card as number;
    return {card, role: element?.getAttribute('role') ?? null, tabindex: element?.getAttribute('tabindex') ?? null};
  });
  console.log('Promoted plain:', JSON.stringify(plain));
  check('promoted-plain-activates', plain.card === 3 && plain.role === 'button' && plain.tabindex === '0');
  for (const part of ['header', 'content', 'media', 'actions']) {
    const before = warnings.length;
    const dynamic = await page.evaluate(part => Reflect.get(window, 'mtrlA18').exerciseWarning(part, true, true), part) as {
      role: string | null;
      tabIndex: number;
      tabindex: string | null;
      action: string;
    };
    await page.waitForTimeout(20);
    check(`card-${part}-article`, dynamic.role === 'article' && dynamic.tabIndex === -1 && dynamic.tabindex === null && dynamic.action === '<button>Dynamic action</button>');
    check(`card-${part}-silent`, warnings.length === before);
  }
  console.log('Card development warnings:', JSON.stringify(warnings));
  console.log('A18 checks:', checks);
  console.log('Expected A18 failures:', JSON.stringify(failures));
  assert.deepEqual(failures, [], `${failures.length} A18 scenarios failed`);
} finally {
  await browser.close();
  server.stop(true);
}

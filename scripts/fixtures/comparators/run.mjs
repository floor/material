// CI-only production builds and browser probes. No upstream sources are built.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build, preview } from 'vite';
import { chromium } from 'playwright';
import { assetRecord, staticClosure, declaredClosure, startupClosure, totals, phaseSets, coverage, digest } from '../../comparators/accounting.mjs';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Comparator installs/builds/browser probes run in GitHub CI only');
const root = dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(await readFile(join(root, 'contract.json'), 'utf8'));
const adapter = process.env.COMPARATOR_ADAPTER;
assert.ok(Object.hasOwn(contract.adapters, adapter), `Unknown comparator ${adapter}`);
const spec = contract.adapters[adapter];
const installed = name => JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
assert.equal(process.version, contract.toolchain.node);
for (const name of ['vite', 'playwright']) assert.equal(installed(name).version, contract.toolchain[name]);
if (spec.version !== 'candidate-artifact') assert.equal(installed(spec.package).version, spec.version);
const artifact = resolve('analysis/comparators', adapter);
await mkdir(artifact, { recursive: true });
const provenance = { adapter, package: spec.package, version: installed(spec.package).version, contract: contract.version,
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), candidateSourceHead: process.env.COMPARATOR_HEAD,
  run: process.env.GITHUB_RUN_ID, node: process.version, npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
  vite: installed('vite').version, playwright: installed('playwright').version,
  lockSha256: digest(await readFile(join(root, 'package-lock.json'))), notes: spec.notes };
await writeFile(join(artifact, 'provenance.json'), JSON.stringify(provenance, null, 2));
const results = [];
let failed = false;
for (const scenario of ['button', 'app']) {
  const directory = join(artifact, scenario); await mkdir(directory, { recursive: true });
  let browser, server, context;
  const result = { ...provenance, scenario, status: 'not-run', missing: scenario === 'app' ? spec.missing : [], checks: [], outcomes: {}, requests: [], assets: [] };
  try {
    const generated = join(root, '.generated', adapter, scenario); await mkdir(generated, { recursive: true });
    await writeFile(join(generated, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Styled comparator</title></head><body><script type="module" src="./main.js"></script></body></html>');
    // The common layout is deliberate fixture cost. It does not replace component styling.
    await writeFile(join(generated, 'main.js'), `import { mount } from ${JSON.stringify(join(root, 'adapters', adapter + '.js'))};\n` +
      `await mount(${JSON.stringify(scenario)});\nconst style=document.createElement('style');style.textContent='body{margin:24px}main{display:block;max-width:900px}section{margin-block:24px;min-width:260px}h2{font:12px sans-serif}';document.head.append(style);\nawait document.fonts.ready;await new Promise(requestAnimationFrame);window.comparatorReady=true;`);
    const relocations = [];
    const built = await build({ root: generated, configFile: false, envDir: false, logLevel: 'warn',
      define: { __COMPARATOR_APP__: JSON.stringify(scenario === 'app') },
      plugins: [{ name: 'self-host-pinned-beer-assets', enforce: 'pre', transform(code, id) {
        if (!id.endsWith('.css') || !id.includes('/beercss/')) return null;
        return code.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/beercss@5\.0\.3\/dist\/cdn\/([^"')\s]+)/g, (url, file) => {
          const target = join(root, 'node_modules/beercss/dist/cdn', file);
          assert.ok(existsSync(target), `Missing pinned upstream asset ${url}`);
          relocations.push({ url, file: `beercss/dist/cdn/${file}`, sha256: digest(readFileSync(target)) }); return target;
        });
      }}],
      build: { outDir: join(directory, 'dist'), emptyOutDir: true, target: contract.build.target, minify: true, cssMinify: contract.build.cssMinify,
        assetsInlineLimit: contract.build.assetsInlineLimit, modulePreload: { polyfill: false }, sourcemap: 'hidden' } });
    const output = built.output;
    const records = output.filter(item => !item.fileName.endsWith('.map')).map(item => {
      const bytes = item.type === 'chunk' ? item.code : item.source;
      const imports = item.type === 'chunk' ? [...item.imports, ...(item.viteMetadata?.importedCss ?? [])] : [];
      if (item.fileName.endsWith('.html')) for (const m of String(bytes).matchAll(/(?:src|href)="\/?(assets\/[^"?#]+)"/g)) imports.push(m[1]);
      if (item.fileName.endsWith('.css')) for (const m of String(bytes).matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        if (m[1].startsWith('data:')) continue;
        assert.ok(!/^https?:/.test(m[1]), `External stylesheet asset ${m[1]}`);
        imports.push(m[1].startsWith('/') ? m[1].slice(1) : posix.normalize(posix.join(posix.dirname(item.fileName), m[1])));
      }
      return { ...assetRecord(item.fileName, bytes, imports, item.type === 'chunk' ? item.dynamicImports : []),
        modules: item.type === 'chunk' ? Object.keys(item.modules).map(id => id.replace(root, '$FIXTURE')) : [] };
    });
    result.assets = records; result.relocations = relocations;
    result.declaredStaticAssets = staticClosure(records, ['index.html']);
    result.fullDeclaredAssets = declaredClosure(records, ['index.html']);
    const closure = startupClosure(records, ['index.html']);
    server = await preview({ root: generated, configFile: false, envDir: false, logLevel: 'error', build: { outDir: join(directory, 'dist') }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
    const address = server.httpServer.address(); const origin = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ headless: true }); result.browser = browser.version();
    context = await browser.newContext({ viewport: { width: 1100, height: 900 }, reducedMotion: 'no-preference', locale: 'en-US', colorScheme: 'light' });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    const errors = [], startup = new Set(), interaction = new Set(); result.errors = errors; let phase = 'startup';
    await context.route('**/*', route => { const url = route.request().url();
      if (!url.startsWith(origin + '/') && !url.startsWith('data:') && !url.startsWith('blob:')) { errors.push(`external request ${url}`); return route.abort(); } return route.continue(); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
      const url = new URL(response.url()); if (url.origin !== origin) return;
      const file = decodeURIComponent(url.pathname.slice(1)) || 'index.html';
      result.requests.push({ file, phase, status: response.status() });
      if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${file}`);
      (phase === 'startup' ? startup : interaction).add(file);
    });
    const check = (name, condition, detail) => { result.checks.push({ name, status: condition ? 'pass' : 'fail', detail }); assert.ok(condition, `${name}: ${JSON.stringify(detail)}`); };
    await page.goto(origin); await page.waitForFunction(() => window.comparatorReady === true);
    await page.waitForLoadState('networkidle'); phase = 'interaction';
    result.browserCapabilities = await page.evaluate(() => ({ baseSelect: CSS.supports('appearance', 'base-select'), anchorPositioning: CSS.supports('position-anchor', '--test'), commandFor: 'commandForElement' in HTMLButtonElement.prototype }));
    const roles = scenario === 'button' ? ['button'] : contract.roles;
    for (const role of roles.filter(role => !result.missing.includes(role))) {
      const measured = await page.evaluate(role => {
        const node = window.fixture.controls[role]; if (!node) return null;
        const visible = [node]; const walk = root => { for (const n of root.children) { visible.push(n); walk(n); if(n.shadowRoot) walk(n.shadowRoot); } }; walk(node); if(node.shadowRoot) walk(node.shadowRoot); const painted = visible.filter(n => n.getBoundingClientRect().width > 0 && n.getBoundingClientRect().height > 0); const target = painted.find(n => !['rgba(0, 0, 0, 0)', 'transparent'].includes(getComputedStyle(n).backgroundColor)) || painted[0] || node; const r = target.getBoundingClientRect(), s = getComputedStyle(target);
        return { tag: node.localName, defined: !node.localName.includes('-') || !!customElements.get(node.localName), width: r.width, height: r.height,
          display: s.display, visibility: s.visibility, color: s.color, background: s.backgroundColor, radius: s.borderRadius, font: s.font, opacity: s.opacity };
      }, role);
      // Closed surfaces have zero geometry until they open. Their actual paint is checked below.
      check(`${role}: mounted`, !!measured?.defined, measured);
      if (!['menu', 'dialog'].includes(role)) check(`${role}: rendered box`, measured.width > 0 && measured.height > 0, measured);
      result.outcomes[role] = { status: 'pass', rendered: measured, interaction: 'not-claimed' };
    }
    const button = page.locator('[data-fixture="button"]').locator(':scope > :last-child');
    await button.click(); check('button: pointer activates once', await page.evaluate(() => window.fixture.state.clicks === 1));
    await button.hover(); await page.screenshot({ path: join(directory, 'button-hover.png') });
    await page.evaluate(() => window.fixture.controls.button.focus());
    await page.keyboard.press('Enter'); check('button: keyboard activation', await page.evaluate(() => window.fixture.state.clicks >= 2));
    await page.screenshot({ path: join(directory, 'button-keyboard-focus.png') });
    const beforeSpace = await page.evaluate(() => window.fixture.state.clicks);
    await page.keyboard.press('Space');
    check('button: Space activates once', await page.evaluate(() => window.fixture.state.clicks) === beforeSpace + 1);
    const pressBox = await button.boundingBox();
    await page.mouse.move(pressBox.x + pressBox.width / 2, pressBox.y + pressBox.height / 2);
    await page.mouse.down(); await page.screenshot({ path: join(directory, 'button-pressed.png') }); await page.mouse.up();
    const clicks = await page.evaluate(() => window.fixture.state.clicks);
    await page.evaluate(() => window.fixture.api.disabled(true));
    const box = await button.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    check('button: disabled suppresses activation', await page.evaluate(() => window.fixture.state.clicks) === clicks);
    await page.evaluate(() => window.fixture.api.disabled(false));
    result.outcomes.button.interaction = 'pointer-keyboard-disabled';
    result.behaviorProbes = [];
    // Capability observations are evidence, not a claim that unequal libraries
    // provide every widget interaction. Failed probes keep the row unrankable.
    const observe = async (name, action) => {
      try { result.behaviorProbes.push({ name, ...await action() }); }
      catch (error) { result.behaviorProbes.push({ name, status: 'gap', error: String(error.message) }); }
    };
    const readState = role => page.evaluate(role => {
      const nodes = []; const walk = root => { nodes.push(root); for (const child of root.children) { walk(child); if (child.shadowRoot) for (const n of child.shadowRoot.children) walk(n); } };
      const root = window.fixture.controls[role]; walk(root); if(root.shadowRoot) for(const n of root.shadowRoot.children) walk(n);
      return nodes.map(n => ({ tag: n.localName, checked: n.checked, selected: n.selected, active: n.active, value: n.value,
        ariaChecked: n.getAttribute('aria-checked'), ariaSelected: n.getAttribute('aria-selected'), ariaPressed: n.getAttribute('aria-pressed'),
        stateClasses: [...n.classList].filter(c => /(?:^|--)(?:active|selected|checked)$/.test(c)) }));
    }, role);
    if (scenario === 'app') {
      for (const [role, query, index] of [['checkbox','checkbox',0], ['switch','switch',0], ['radios','radio',1], ['chips',null,0], ['tabs','tab',1]]) {
        if (result.missing.includes(role)) { result.behaviorProbes.push({ name: `${role}: pointer state`, status: 'unsupported' }); continue; }
        await observe(`${role}: pointer state`, async () => {
          const before = await readState(role);
          const section = page.locator(`[data-fixture="${role}"]`);
          let target = query ? section.getByRole(query).nth(index) : section.getByText('Filter', { exact: true });
          if (role === 'switch' && await target.count() === 0) target = section.getByRole('checkbox');
          await target.click({ timeout: 3000 });
          const after = await readState(role); return { status: JSON.stringify(before) !== JSON.stringify(after) ? 'observed-change' : 'gap', before, after };
        });
      }
      if (!result.missing.includes('tabs')) await observe('tabs: ArrowRight navigation', async () => {
        const before = await readState('tabs'); await page.keyboard.press('ArrowRight');
        const after = await readState('tabs'); return { status: JSON.stringify(before) !== JSON.stringify(after) ? 'observed-change' : 'gap', before, after };
      });
      const field = page.locator('[data-fixture="text-field"]').getByRole('textbox'); await field.fill('Ada');
      check('text-field: user typing', await page.evaluate(() => window.fixture.api.getValue('text-field')) === 'Ada');
      for (const [role, value] of [ ['select', 'rome'], ['slider', 70], ['progress', 70]]) {
        await page.evaluate(({ role, value }) => window.fixture.api.setValue(role, value), { role, value });
        const actual = await page.evaluate(role => window.fixture.api.getValue(role), role);
        check(`${role}: public value update`, String(actual) === String(value), { expected: value, actual });
        result.outcomes[role].interaction = 'public-value-update';
      }
      for (const kind of ['Dialog', 'Menu']) {
        const role = kind.toLowerCase();
        await page.evaluate(async kind => {
          const trigger = document.createElement('button'); trigger.id = 'probe-trigger'; trigger.textContent = `Open ${kind}`; document.body.append(trigger); trigger.focus();
          await window.fixture.api[`open${kind}`](trigger);
        }, kind);
        await page.waitForFunction(kind => window.fixture.api[kind.toLowerCase() + 'Open'](), kind);
        // Open state can be synchronous while lazy modules and entrance animations
        // are still pending. Wait for paint without altering upstream motion.
        await page.waitForFunction(role => {
          const n = window.fixture.controls[role]; const nodes = [n];
          const walk = root => { for (const child of root.children) { nodes.push(child); walk(child); if (child.shadowRoot) walk(child.shadowRoot); } };
          walk(n); if (n.shadowRoot) walk(n.shadowRoot);
          return nodes.some(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility === 'visible' && s.display !== 'none'; });
        }, role);
        const visible = await page.evaluate(role => { const n = window.fixture.controls[role]; const nodes = [n]; const walk = root => { for(const child of root.children){ nodes.push(child); walk(child); if(child.shadowRoot) walk(child.shadowRoot); } }; walk(n); if(n.shadowRoot) walk(n.shadowRoot); const r = nodes.map(el => el.getBoundingClientRect()).find(r => r.width > 0 && r.height > 0) || n.getBoundingClientRect(); return { width:r.width,height:r.height,display:getComputedStyle(n).display }; }, role);
        check(`${role}: open paints`, visible.width > 0 && visible.height > 0, visible);
        await page.screenshot({ path: join(directory, `${role}-open.png`) });
        await observe(`${role}: Escape and focus return`, async () => {
          await page.keyboard.press('Escape');
          await page.waitForFunction(kind => !window.fixture.api[kind.toLowerCase() + 'Open'](), kind, { timeout: 3000 });
          return { status: 'closed', focusReturned: await page.evaluate(() => document.activeElement?.id === 'probe-trigger') };
        });
        if (!await page.evaluate(kind => window.fixture.api[kind.toLowerCase() + 'Open'](), kind)) await page.evaluate(kind => window.fixture.api[`open${kind}`](document.getElementById('probe-trigger')), kind);
        if (kind === 'Menu') await observe('menu: pointer selection', async () => {
          const item = page.getByRole('menuitem').filter({ hasText: 'One' }).first();
          await item.click({ timeout: 3000 });
          return { status: 'activated', closed: !await page.evaluate(() => window.fixture.api.menuOpen()) };
        });
        await page.evaluate(async kind => { await window.fixture.api[`close${kind}`](); document.getElementById('probe-trigger')?.remove(); }, kind);
        await page.waitForFunction(kind => !window.fixture.api[kind.toLowerCase() + 'Open'](), kind);
        result.outcomes[role].interaction = 'public-open-close';
      }
    }
    // Explicit boundaries: values/open-close do not stand in for a full keyboard/widget audit.
    result.behaviorCoverage = { button: ['rest', 'hover', 'keyboard focus', 'Enter', 'Space', 'pointer', 'pressed screenshot', 'disabled'],
      app: scenario === 'app' ? ['public value updates', 'dialog/menu public open-close'] : [],
      unverified: ['separate toggle/loading button profiles', 'reduced-motion animation equivalence', 'complete widget keyboard navigation', 'pointer select choice', 'tabs panel wiring'],
      fullBehaviorParity: false };
    result.coverage = coverage(roles, result.missing, result.outcomes);
    result.coverage.comparableFullApp = false; // Never rank this bounded probe as full behavioral parity.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.screenshot({ path: join(directory, 'reduced-motion.png'), fullPage: true });
    await page.waitForLoadState('networkidle'); check('no page/resource errors', errors.length === 0, errors);
    result.phases = phaseSets(closure, [...startup], [...interaction], records.map(r => r.file));
    result.phases.fullDeclared = result.fullDeclaredAssets;
    result.sizes = Object.fromEntries(Object.entries(result.phases).map(([phaseName, names]) => [phaseName, {
      inclusive: totals(records, names), js: totals(records, names.filter(n => records.find(r => r.file === n)?.kind === 'js')),
      css: totals(records, names.filter(n => records.find(r => r.file === n)?.kind === 'css')),
      binary: totals(records, names.filter(n => records.find(r => r.file === n)?.kind === 'binary')),
      html: totals(records, names.filter(n => records.find(r => r.file === n)?.kind === 'html')) } ]));
    result.status = 'pass';
  } catch (error) { result.status = 'fail'; result.error = String(error.stack ?? error); failed = true; console.error(`${adapter}/${scenario}: ${result.error}`); }
  finally {
    if (context) { await context.tracing.stop({ path: join(directory, 'trace.zip') }); await context.close(); }
    if (browser) await browser.close();
    if (server) await new Promise(resolve => { server.httpServer.closeAllConnections?.(); server.httpServer.close(resolve); });
    await writeFile(join(directory, 'result.json'), JSON.stringify(result, null, 2)); results.push(result);
    console.log(JSON.stringify({ adapter, scenario, status: result.status, coverage: result.coverage, sizes: result.sizes?.initial }));
  }
}
await writeFile(join(artifact, 'summary.json'), JSON.stringify(results.map(({ assets, ...row }) => ({ ...row, assetCount: assets.length })), null, 2));
if (failed) process.exitCode = 1;

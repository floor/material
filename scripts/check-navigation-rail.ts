#!/usr/bin/env bun
import assert from 'node:assert/strict';
import { checkRailHeaderFab } from './check-rail-header-fab';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import type { NavigationRailComponent, NavigationRailConfig } from '../src/components/navigation-rail/types';
declare global {
    interface Window {
        rail: NavigationRailComponent;
        mountRail: (config: NavigationRailConfig) => void;
    }
}
const artifacts = resolve('analysis/navigation-rail');
// Text antialiasing is not deterministic to the byte, even for the same page
// twice, so two screenshots count as the same when only a handful of pixels
// differ by a little; a wrong colour, a moved box or a missing rule differs by
// hundreds of pixels and by whole channels.
async function comparePngs(page: import('playwright').Page, a: Buffer, b: Buffer): Promise<{ differing: number; maxDelta: number }> {
    return page.evaluate(async ([a, b]) => {
        const load = (src: string) => new Promise<HTMLImageElement>(resolve => { const image = new Image(); image.onload = () => resolve(image); image.src = 'data:image/png;base64,' + src; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        const canvas = document.createElement('canvas'); canvas.width = ia.width; canvas.height = ia.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(ia, 0, 0); const da = context.getImageData(0, 0, canvas.width, canvas.height).data;
        context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(ib, 0, 0); const db = context.getImageData(0, 0, canvas.width, canvas.height).data;
        if (ia.width !== ib.width || ia.height !== ib.height) return { differing: Infinity, maxDelta: 255 };
        let differing = 0, maxDelta = 0;
        for (let i = 0; i < da.length; i += 4) {
            const delta = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
            if (delta) { differing++; if (delta > maxDelta) maxDelta = delta; }
        }
        return { differing, maxDelta };
    }, [a.toString('base64'), b.toString('base64')]);
}

await mkdir(artifacts, { recursive: true });
const build = await Bun.build({ entrypoints: [resolve('dist/components/navigation-rail/index.js')], target: 'browser', minify: true });
assert(build.success, String(build.logs));
const js = await build.outputs[0].text();
// The element route. The items live in the host's shadow root, whose sheets
// register into the build's own registry, so the fixture imports the element
// and its styles from dist.
const elementBundle = await Bun.build({ entrypoints: [resolve('scripts/fixtures/navigation-elements.ts')], target: 'browser', minify: true });
assert(elementBundle.success, String(elementBundle.logs));
const elementJs = await elementBundle.outputs[0].text();
const itemIcon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === '/rail.js')
            return new Response(js, { headers: { 'Content-Type': 'text/javascript' } });
        if (url.pathname === '/nav-elements.js')
            return new Response(elementJs, { headers: { 'Content-Type': 'text/javascript' } });
        if (url.pathname === '/element') return new Response(`<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/full.css"><style>body{margin:0;display:flex;height:100vh}</style></head>
<body><div id="host"><m-navigation-rail value="inbox" no-toggle>
<m-navigation-rail-item value="inbox" icon='${itemIcon}'>Inbox</m-navigation-rail-item>
<m-navigation-rail-item value="trips" icon='${itemIcon}' badge="8">Trips</m-navigation-rail-item>
<m-navigation-rail-item value="saved" icon='${itemIcon}' badge="">Saved</m-navigation-rail-item>
<m-navigation-rail-item value="alerts" icon='${itemIcon}' badge="0">Alerts</m-navigation-rail-item>
<m-navigation-rail-item value="spam" icon='${itemIcon}' badge="1000">Spam</m-navigation-rail-item>
</m-navigation-rail></div><script type="module" src="/nav-elements.js"></script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
        if (url.pathname === '/full.css')
            return new Response(Bun.file('dist/styles.css'));
        if (url.pathname === '/base.css')
            return new Response(Bun.file('dist/styles/base.css'));
        if (url.pathname === '/rail.css')
            return new Response(Bun.file('dist/styles/navigation-rail.css'));
        const styles = url.searchParams.has('selective') ? '<link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/rail.css">' : '<link rel="stylesheet" href="/full.css">';
        return new Response(`<!doctype html><html><head>${styles}<style>body{margin:0;display:flex;height:100vh}main{padding:24px;flex:1}</style></head><body><main><button id="outside">Open navigation</button></main><script type="module">
  import createNavigationRail from '/rail.js';
  const icon='<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zm2 2v1l7 4 7-4V7l-7 4z"/></svg>';
  window.mountRail=config=>{window.rail?.destroy();window.rail=createNavigationRail({items:[{id:'inbox',label:'Inbox',icon,active:true,badge:24},{id:'sent',label:'Sent',icon,href:'/sent'},{id:'disabled',label:'Disabled',icon,disabled:true},{id:'family',label:'Family',icon,badge:true,badgeLabel:'New messages'}],onSelect:event=>event.originalEvent.preventDefault(),...config});document.body.prepend(window.rail.element)};
  document.querySelector('#outside').onclick=()=>window.rail.expand();
  </script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
    } });
const browser = await chromium.launch();
try {
    // One page for both stylesheets: two pages rasterise text differently on
    // the same machine, so the comparison must swap the stylesheet in place.
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const urls = [`http://127.0.0.1:${server.port}/`, `http://127.0.0.1:${server.port}/?selective`];
    let count = 0;
    for (const expanded of [false, true])
        for (const direction of ['ltr', 'rtl'])
            for (const mode of ['light', 'dark'])
                for (const height of [360, 720]) {
                    const shots: Buffer[] = [];
                    for (const [i, url] of urls.entries()) {
                        await page.goto(url);
                        await page.waitForFunction(() => !!window.mountRail);
                        // The comparison is of static styling, and reduced motion keeps fades, so
                        // transitions are switched off on both pages before anything is captured
                        await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
                        await page.setViewportSize({ width: 900, height });
                        await page.evaluate(({ expanded, direction, mode }) => {
                            document.documentElement.dir = direction;
                            document.documentElement.dataset.theme = 'baseline';
                            document.documentElement.dataset.themeMode = mode;
                            window.mountRail({ expanded });
                        }, { expanded, direction, mode });
                        const geometry = await page.locator('.mtrl-navigation-rail').boundingBox();
                        assert(geometry);
                        assert.equal(geometry.width, expanded ? 280 : 96);
                        const item = page.locator('[data-id="inbox"]');
                        assert.equal((await item.boundingBox())!.width, geometry.width, 'Destination hit target must span the rail');
                        const indicator = await item.locator('.mtrl-navigation-rail__indicator').boundingBox();
                        assert(indicator);
                        assert.equal(indicator.height, expanded ? 56 : 32);
                        if (!expanded)
                            assert.equal(indicator.width, 56);
                        await item.focus();
                        await page.keyboard.press('ArrowDown');
                        await page.keyboard.press('ArrowDown');
                        assert.equal(await page.locator('[data-id="family"]').evaluate(el => el === document.activeElement), true);
                        assert.equal(await page.evaluate(() => window.rail.getActive()), 'inbox');
                        await page.keyboard.press('Enter');
                        assert.equal(await page.evaluate(() => window.rail.getActive()), 'family');
                        await page.evaluate(() => { window.rail.element.scrollTop = 0; return new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
                        shots.push(await page.screenshot({ path: `${artifacts}/${expanded ? 'expanded' : 'collapsed'}-${direction}-${mode}-${height}${i ? '-selective' : ''}.png` }));
                    }
                    const diff = await comparePngs(page, shots[0], shots[1]);
                    assert(diff.differing <= 32 && diff.maxDelta <= 24, `Full and selective rail CSS differ: ${expanded ? 'expanded' : 'collapsed'}-${direction}-${mode}-${height}: ${diff.differing} pixels, max channel delta ${diff.maxDelta}`);
                    count++;
                }
    await page.goto(urls[0]);
    await page.waitForFunction(() => !!window.mountRail);
    await page.evaluate(() => { window.mountRail({ expanded: false }); window.rail.element.querySelector<HTMLElement>('[data-id="inbox"]')!.focus(); window.rail.expand(); });
    assert.equal(await page.locator('[data-id="inbox"]').evaluate(el => el === document.activeElement), true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('[data-id="sent"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.mtrl-navigation-rail__ripple').length === 0, undefined, { timeout: 2000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => window.mountRail({ layout: 'modal' }));
    await page.click('#outside');
    assert.equal(await page.getByRole('dialog').count(), 1);
    for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => window.rail.element.contains(document.activeElement)), true);
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.locator('#outside').evaluate(el => el === document.activeElement), true);
    await page.evaluate(() => { window.mountRail({ layout: 'modal', expanded: true }); });
    await page.waitForFunction(() => document.querySelector('dialog')?.open);
    const modalBox = await page.getByRole("dialog").boundingBox();
    assert(modalBox);
    await page.mouse.click(modalBox.x > 0 ? 20 : 880, 700);
    assert.equal(await page.evaluate(() => window.rail.isExpanded()), false);

    // Badges that say what they show: the name carries the badge's displayed
    // label — "The accessibility label for a badge item will be read after its
    // navigation destination. Any numerical badges will have their number read,
    // while non-counting badges will simply announce New notification"
    // (m3.material.io/components/badges/accessibility, Labeling elements) — a
    // label too long for the badge is capped as the badge caps it (four
    // characters, "including a + to indicate more", the guidelines' Label
    // text), and an empty or zero count clears the badge (the badge
    // component's own rule, PR 146), collapsed and expanded alike.
    type AxNode = { role?: { value?: string }; name?: { value?: string } };
    const namesOf = async (p: import('playwright').Page): Promise<string[]> => {
        const cdp = await p.context().newCDPSession(p);
        const tree = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: AxNode[] };
        await cdp.detach();
        return tree.nodes.filter((n) => n.role?.value === 'button' || n.role?.value === 'link').map((n) => n.name?.value ?? '');
    };
    await page.evaluate((icon: string) => window.mountRail({ showToggle: false, items: [
        { id: 'count', label: 'Count', icon, badge: 8 },
        { id: 'thousand', label: 'Thousand', icon, badge: 1000 },
        { id: 'tenthousand', label: 'Tenthousand', icon, badge: 10000 },
        { id: 'dot', label: 'Dot', icon, badge: true },
        { id: 'dotlabel', label: 'Dotlabel', icon, badge: true, badgeLabel: 'New messages' },
        { id: 'link', label: 'Link', icon, badge: 5, href: '/x' },
    ] }), itemIcon);
    await page.waitForTimeout(200);
    const expected = ['Count, 8', 'Thousand, 1000', 'Tenthousand, 999+', 'Dot, New notification', 'Dotlabel, New messages', 'Link, 5', 'Open navigation'];
    assert.deepEqual(await namesOf(page), expected, 'the badge\'s displayed label is in the name, capped as the badge caps it, the dot announcing New notification');
    // Placement, collapsed: the badges spec states the distance "from top
    // trailing icon corner to bottom leading badge corner" — 14x12dp for the
    // large badge, 6x6dp for the small one (m3.material.io/components/badges/
    // specs, Measurements). The expanded rail moves the badge to the end of
    // the pill, which is this library's own documented layout.
    const placementOf = (id: string) => page.evaluate((target: string) => {
        const box = (element: Element) => { const rect = element.getBoundingClientRect(); return { l: rect.left, r: rect.right, t: rect.top, b: rect.bottom }; };
        const item = document.querySelector(`.mtrl-navigation-rail__item[data-id="${target}"]`)!;
        return { icon: box(item.querySelector('.mtrl-navigation-rail__icon')!), badge: box(item.querySelector('.mtrl-navigation-rail__badge')!) };
    }, id);
    for (const [id, inset, under] of [['count', 12, 14], ['dot', 6, 6]] as const) {
        const { icon, badge } = await placementOf(id);
        const insetMeasured = icon.r - badge.l, underMeasured = badge.b - icon.t;
        assert.ok(Math.abs(insetMeasured - inset) <= 0.5 && Math.abs(underMeasured - under) <= 0.5,
            `${id === 'count' ? 'the large badge' : 'the small dot'} sits ${inset}x${under}dp from the icon's top trailing corner (spec), measured ${insetMeasured.toFixed(1)}x${underMeasured.toFixed(1)}`);
    }
    await page.evaluate(() => window.rail.expand());
    await page.waitForTimeout(500);
    assert.deepEqual(await namesOf(page), expected, 'expansion keeps the badged names');
    const badgeState = () => page.evaluate(() => {
        const item = document.querySelector('.mtrl-navigation-rail__item[data-id="count"]')!;
        const badge = item.querySelector('.mtrl-navigation-rail__badge');
        return { gone: badge === null, name: item.getAttribute('aria-label'), text: badge?.textContent ?? null };
    });
    await page.evaluate(() => window.rail.setBadge('count', 0));
    assert.deepEqual(await badgeState(), { gone: true, name: 'Count', text: null }, 'a zero count clears the badge');
    await page.evaluate(() => window.rail.setBadge('count', ''));
    assert.deepEqual(await badgeState(), { gone: true, name: 'Count', text: null }, 'an empty count clears the badge');
    await page.evaluate(() => window.rail.setBadge('count', 12));
    assert.deepEqual(await badgeState(), { gone: false, name: 'Count, 12', text: '12' }, 'a count after the empty values shows again');

    // The element, through its shadow root
    const elementPage = await browser.newPage({ viewport: { width: 900, height: 720 } });
    const elementErrors: string[] = [];
    elementPage.on('pageerror', (error) => elementErrors.push(error.message));
    await elementPage.goto(`${server.url.href}element`);
    await elementPage.waitForFunction(() => (window as unknown as { navigationElementsReady?: boolean }).navigationElementsReady === true);
    await elementPage.waitForTimeout(80);
    assert.deepEqual(await namesOf(elementPage), ['Inbox', 'Trips, 8', 'Saved, New notification', 'Alerts', 'Spam, 1000'], 'a declared badge names its item through the shadow root; the dot announces New notification; a zero clears');
    await elementPage.evaluate(() => document.querySelector('m-navigation-rail-item[value="spam"]')!.setAttribute('badge', '10000'));
    await elementPage.waitForTimeout(120);
    assert.deepEqual(await namesOf(elementPage), ['Inbox', 'Trips, 8', 'Saved, New notification', 'Alerts', 'Spam, 999+'], 'an attribute change updates the capped name in place');
    assert.deepEqual(elementErrors, []);
    await elementPage.close();

    for (let i = 0; i < 40; i++) {
        await page.evaluate(() => window.mountRail({ layout: 'modal', expanded: true }));
        await page.waitForFunction(() => document.querySelector('dialog')?.open);
        await page.evaluate(() => window.rail.destroy());
    }
    assert.equal(await page.locator('.mtrl-navigation-rail').count(), 0);
    assert.deepEqual(errors, []);
    console.log(`Passed ${count} full/selective Expressive rail scenes, keyboard selection, ripple, expansion, badges that say what they show (name, 999+ cap, empty and zero cleared, New notification dot, spec placement, collapsed, expanded and shadow root), native modal focus/Escape/scrim, and 40 teardown cycles.`);
}
finally {
    await browser.close();
    server.stop(true);
}

await checkRailHeaderFab();

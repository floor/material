/** Packed selective CSS, native dialog, date entry and real keyboard integration. */
import assert from "node:assert/strict";
import { join } from "node:path";
import type { Page } from "playwright";
import type createDatePicker from "../src/components/datepicker";

type PickerWindow = Window & { core: { createDatePicker: typeof createDatePicker }; picker: ReturnType<typeof createDatePicker>; dateChanges: string[]; dateCloses: number };
export async function checkDatePicker(page: Page, artifacts: string): Promise<void> {
  await page.setViewportSize({ width: 800, height: 850 });
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow;
    document.documentElement.setAttribute('data-theme', 'baseline'); document.documentElement.setAttribute('data-theme-mode', 'light');
    document.body.replaceChildren(); document.body.style.cssText = 'padding:24px;margin:0';
    const outside = document.createElement('button'); outside.id = 'outside-date'; outside.textContent = 'Outside'; document.body.append(outside);
    state.dateChanges = []; state.dateCloses = 0;
    state.picker = state.core.createDatePicker({ variant: 'modal', label: 'Departure', value: '2024-01-31', minDate: '2024-01-01', maxDate: '2026-12-31' });
    document.body.append(state.picker.element);
    state.picker.on('change', value => state.dateChanges.push(value.formattedValue)); state.picker.on('close', () => state.dateCloses++);
  });
  const trigger = page.locator('[data-action="open"]'); await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Departure' });
  assert.equal(await dialog.evaluate(el => el.matches(':modal')), true);
  assert.equal(await dialog.evaluate(el => getComputedStyle(el).borderRadius), '28px');
  assert.equal(await dialog.evaluate(el => el.getBoundingClientRect().width), 360);
  assert.equal(await page.locator('.mtrl-datepicker__modal-header').evaluate(el => el.getBoundingClientRect().height), 120);
  assert.match(await dialog.evaluate(el => getComputedStyle(el, '::backdrop').backgroundColor), /(?:rgba\(0, 0, 0, 0\.32\)|color\(srgb 0 0 0 \/ 0\.32\))/);
  assert.equal(await page.locator('[data-date="2024-01-31"]').evaluate(el => getComputedStyle(el, '::before').width), '40px');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-date')), '2024-01-31');
  await page.keyboard.press('PageDown'); assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-date')), '2024-02-29');
  await page.keyboard.press('Enter'); assert.deepEqual(await page.evaluate(() => (window as unknown as PickerWindow).dateChanges), []);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), '01/31/2024');
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
  await trigger.click(); await page.getByRole('button', { name: 'Switch to date input' }).click();
  const entry = page.getByLabel('Date', { exact: true }); await entry.fill('02/30/2024');
  assert.equal(await entry.getAttribute('aria-invalid'), 'true'); assert.equal(await page.getByRole('button', { name: 'OK', exact: true }).isDisabled(), true);
  await entry.fill('02/29/2024');
  await page.screenshot({ path: join(artifacts, 'datepicker-input-light.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => (window as unknown as PickerWindow).dateChanges), ['02/29/2024']);
  await trigger.click();
  await page.evaluate(() => document.getElementById('outside-date')?.focus());
  assert.equal(await page.locator('#outside-date').evaluate(el => el === document.activeElement), false, 'Native modal must prevent background focus');
  await page.getByRole('button', { name: 'OK', exact: true }).focus(); await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button', { name: 'Switch to date input' }).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Shift+Tab'); assert.equal(await page.getByRole('button', { name: 'OK', exact: true }).evaluate(el => el === document.activeElement), true);
  await page.screenshot({ path: join(artifacts, 'datepicker-calendar-light.png'), animations: 'disabled' });
  const light = await dialog.evaluate(el => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme-mode', 'dark'));
  assert.notEqual(await dialog.evaluate(el => getComputedStyle(el).backgroundColor), light);
  await page.screenshot({ path: join(artifacts, 'datepicker-calendar-dark.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 375, height: 667 });
  assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true);
  await page.screenshot({ path: join(artifacts, 'datepicker-mobile.png'), animations: 'disabled' });
  await page.mouse.click(2, 2); assert.equal(await dialog.count(), 0, 'Scrim dismissal should close the dialog');
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await trigger.click(); await page.keyboard.press('Escape'); assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow; state.picker.destroy();
    state.picker = state.core.createDatePicker({ variant: 'modal-input', selectionMode: 'range', value: ['2026-09-10', '2026-09-15'] }); document.body.append(state.picker.element); state.picker.open();
  });
  await page.getByLabel('End date', { exact: true }).fill('09/20/2026'); await page.getByRole('button', { name: 'OK', exact: true }).click();
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), '09/10/2026 - 09/20/2026');
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow; state.picker.destroy(); state.picker = state.core.createDatePicker({ value: '2026-09-15' }); document.body.append(state.picker.element);
  });
  await page.getByRole('textbox', { name: 'Select date', exact: true }).fill('09/25/2026'); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), '09/25/2026');
  await page.locator('[data-action="open"]').click(); assert.equal(await page.locator('dialog').evaluate(el => el.matches(':modal')), false);
  await page.locator('[data-date="2026-09-26"]').click();
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), '09/26/2026');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), '09/27/2026');
  // The months page horizontally, as m3.material.io's guidelines have it.
  // With motion on, so the arrows take the sliding path (core:check reduces motion earlier).
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const month = () => page.locator('dialog [role="grid"]:not([aria-hidden])').getAttribute('aria-label');
  const settled = (label: string) => page.waitForFunction(label => document.querySelector('dialog [role="grid"]:not([aria-hidden])')?.getAttribute('aria-label') === label, label);
  assert.equal(await month(), 'September 2026');
  const track = await page.locator('.mtrl-datepicker__track').evaluate(el => ({
    snap: getComputedStyle(el).scrollSnapType, pages: el.children.length, centred: el.scrollLeft === el.clientWidth,
    neighbours: [...el.children].filter(child => child.hasAttribute('inert') && child.getAttribute('aria-hidden') === 'true' && !child.querySelector('[data-date]')).length,
  }));
  assert.deepEqual(track, { snap: 'x mandatory', pages: 3, centred: true, neighbours: 2 }, 'three snapping pages, the current one centred, its neighbours inert and hidden');
  // A horizontal wheel or trackpad swipe pages to the next month and re-centres.
  const box = (await page.locator('.mtrl-datepicker__track').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(box.width, 0);
  await settled('October 2026');
  assert.equal(await page.locator('.mtrl-datepicker__track').evaluate(el => el.scrollLeft === el.clientWidth), true, 'the track re-centres on the new month');
  // The arrow slides the same way, and keeps focus on itself.
  await page.locator('[data-action="prev"]').click();
  assert.equal(await month(), 'October 2026', 'the arrow slides first; the month changes when the slide settles');
  await settled('September 2026');
  assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.action), 'prev', 'focus stays on the arrow');
  // Right to left: swiping toward the start (a positive wheel still scrolls toward the end) pages forward.
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.locator('[data-action="next"]').click();
  await settled('October 2026');
  assert.equal(await page.locator('.mtrl-datepicker__track').evaluate(el => Math.abs(el.scrollLeft) === el.clientWidth), true, 'right to left, the track re-centres');
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  // Reduced motion: the arrow changes the month at once.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-action="next"]').click();
  assert.equal(await month(), 'November 2026', 'reduced motion changes the month without sliding');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // The year picker scrolls vertically in the calendar's own height, opened
  // with the selected year in the middle, and has no paging arrows.
  const calendarHeight = await page.locator('.mtrl-datepicker__track').evaluate(el => el.getBoundingClientRect().height);
  await page.locator('[data-action="year"]').click();
  const years = await page.locator('.mtrl-datepicker__years').evaluate(list => {
    const selected = list.querySelector<HTMLElement>('[aria-pressed="true"]')!;
    const l = list.getBoundingClientRect(), s = selected.getBoundingClientRect();
    return { height: l.height, scrolls: list.scrollHeight > list.clientHeight, selected: selected.dataset.year, offCentre: Math.abs((s.top + s.height / 2) - (l.top + l.height / 2)), arrows: document.querySelectorAll('dialog [data-action="prev"], dialog [data-action="next"]').length };
  });
  assert.equal(years.height, calendarHeight, 'the year list takes the calendar height');
  assert.equal(years.scrolls, true, 'the year list scrolls');
  assert.equal(years.selected, '2026', 'the selected year is the current one');
  assert.ok(years.offCentre <= 30, `the selected year opens in the middle (${years.offCentre}px off)`);
  assert.equal(years.arrows, 0, 'no paging arrows on the year list');
  // The full-screen range picker fills the viewport, opens on the value's
  // month, and extends its month list as it scrolls without moving what is shown.
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow; state.picker.destroy();
    state.picker = state.core.createDatePicker({ variant: 'fullscreen', selectionMode: 'range', label: 'Trip', value: ['2026-09-10', '2026-09-15'] });
    document.body.append(state.picker.element); state.picker.open();
  });
  const full = await page.evaluate(() => {
    const dialog = document.querySelector('dialog')!, list = document.querySelector<HTMLElement>('.mtrl-datepicker__list')!;
    const rect = dialog.getBoundingClientRect(), top = list.getBoundingClientRect().top;
    const first = [...list.querySelectorAll('.mtrl-datepicker__subhead')].find(el => el.getBoundingClientRect().bottom > top)?.textContent;
    return { fills: rect.width === innerWidth && rect.height === innerHeight, radius: getComputedStyle(dialog).borderRadius, header: document.querySelector('.mtrl-datepicker__modal-header')!.getBoundingClientRect().height, first, modal: dialog.matches(':modal') };
  });
  assert.deepEqual(full, { fills: true, radius: '0px', header: 128, first: 'September 2026', modal: true }, 'full screen, no corners, a 128dp header, opened on the value month');
  const anchor = () => page.evaluate(() => { const list = document.querySelector<HTMLElement>('.mtrl-datepicker__list')!; const month = [...list.querySelectorAll('.mtrl-datepicker__subhead')].find(el => el.getBoundingClientRect().bottom > list.getBoundingClientRect().top)!; return { month: month.textContent, count: list.querySelectorAll('.mtrl-datepicker__subhead').length }; });
  await page.locator('.mtrl-datepicker__list').evaluate(el => { el.scrollTop = 0; });
  await page.waitForFunction(() => document.querySelectorAll('.mtrl-datepicker__subhead').length > 25);
  assert.deepEqual(await anchor(), { month: 'September 2025', count: 37 }, 'a year added above, the view kept on the same month');
  await page.locator('[data-date="2025-09-02"]').click(); await page.locator('[data-date="2025-09-05"]').click();
  await page.locator('.mtrl-datepicker__save').click();
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), '09/02/2025 - 09/05/2025', 'Save commits the range');
  await page.evaluate(() => (window as unknown as PickerWindow).picker.open());
  await page.locator('[aria-label="Close"]').click();
  assert.equal(await page.evaluate(() => document.querySelector('dialog')!.open), false, 'Close dismisses');
  // The painted audit. Day states, container corners and height, outside and
  // in-range colours, the range band's square ends, and right-to-left keys and chevrons.
  const role = (name: string) => page.evaluate(name => { const probe = document.createElement('i'); probe.style.color = `var(--mtrl-sys-color-${name})`; document.body.append(probe); const colour = getComputedStyle(probe).color; probe.remove(); return colour; }, name);
  const mix = (name: string, percent: number) => page.evaluate(([name, percent]) => { const probe = document.createElement('i'); probe.style.color = `color-mix(in srgb, var(--mtrl-sys-color-${name}) ${percent}%, transparent)`; document.body.append(probe); const colour = getComputedStyle(probe).color; probe.remove(); return colour; }, [name, percent] as const);
  const remount = (config: Record<string, unknown>) => page.evaluate(config => {
    const state = window as unknown as PickerWindow; state.picker.destroy();
    state.picker = state.core.createDatePicker(config as Parameters<typeof state.core.createDatePicker>[0]); document.body.append(state.picker.element); state.picker.open();
  }, config);
  const layer = (date: string) => page.locator(`[data-date="${date}"]`).evaluate(el => { const c = getComputedStyle(el, '::after'); return { background: c.backgroundColor, ring: `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor} ${c.outlineOffset}` }; });
  await remount({ variant: 'modal', value: '2026-09-15' });
  assert.equal(await page.locator('dialog').evaluate(el => el.getBoundingClientRect().height), 568, 'the modal is 568dp, as in Compose');
  assert.equal(await page.locator('[data-date="2026-10-01"]').count() + await page.locator('.mtrl-datepicker__track > :not([aria-hidden]) .mtrl-datepicker__day--outside').count() > 0, true);
  assert.equal(await page.locator('.mtrl-datepicker__track > :not([aria-hidden]) .mtrl-datepicker__day--outside').first().evaluate(el => getComputedStyle(el).color), await mix('on-surface', 38), 'outside-month days: on-surface 38%');
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await layer('2026-09-16'), { background: await mix('on-surface-variant', 10), ring: `3px solid ${await role('secondary')} 2px` }, 'a focused day: a 0.10 layer and the 3dp focus ring');
  await page.locator('[data-date="2026-09-17"]').hover();
  assert.equal((await layer('2026-09-17')).background, await mix('on-surface-variant', 8), 'hover: on-surface-variant 0.08');
  await page.mouse.down();
  assert.equal((await layer('2026-09-17')).background, await mix('on-surface-variant', 10), 'pressed: 0.10');
  await page.mouse.up(); await page.mouse.move(0, 0);
  await page.locator('[data-date="2026-09-17"]').hover();
  assert.equal((await layer('2026-09-17')).background, await mix('on-primary', 8), 'the selected day: an on-primary layer');
  await page.mouse.move(0, 0);
  await remount({ value: '2026-09-15' });
  assert.equal(await page.locator('dialog').evaluate(el => getComputedStyle(el).borderRadius), '16px', 'docked: corner-large');
  await remount({ variant: 'modal', selectionMode: 'range', value: ['2026-09-09', '2026-09-17'] });
  const band = await page.evaluate(() => {
    const start = document.querySelector('.mtrl-datepicker__track > :not([aria-hidden]) .mtrl-datepicker__cell--range-start')!;
    const c = getComputedStyle(start);
    return { size: c.backgroundSize, position: c.backgroundPosition, radius: c.borderRadius, inRange: getComputedStyle(document.querySelector('[data-date="2026-09-11"]')!).color };
  });
  assert.deepEqual(band, { size: '50% 100%', position: '100% 0px', radius: '0px', inRange: await role('on-secondary-container') }, 'the band starts square at the centre of the start date; in-range days on-secondary-container');
  // Where the range wraps a week, the band runs through the grid's 12dp inline padding
  // to the container edge (m3.material.io's range picker): out of the last column on
  // the row it leaves, into the first on the row it continues on. Nowhere else.
  const bleed = (date: string) => page.locator(`[data-date="${date}"]`).evaluate(day => {
    const cell = day.parentElement!, grid = cell.closest('.mtrl-datepicker__days')!, c = getComputedStyle(cell, '::before');
    if (c.content === 'none') return null;
    const r = cell.getBoundingClientRect(), g = grid.getBoundingClientRect(), left = r.left + parseFloat(c.left), width = parseFloat(c.width);
    // From the cell's right side to the grid's right edge, or from the grid's left edge to the cell's left side.
    const edge = Math.abs(left - r.right) < 0.5 && Math.abs(left + width - g.right) < 0.5 ? 'right' : Math.abs(left - g.left) < 0.5 && Math.abs(left + width - r.left) < 0.5 ? 'left' : `${left}..${left + width} in ${g.left}..${g.right}`;
    return { edge, width, top: c.top, height: c.height, colour: c.backgroundColor };
  });
  const secondary = await role('secondary-container');
  const wraps = async (label: string, rtl = false) => {
    const out = rtl ? 'left' : 'right', back = rtl ? 'right' : 'left';
    assert.deepEqual(await bleed('2026-09-12'), { edge: out, width: 12, top: '4px', height: '40px', colour: secondary }, `${label}: a middle day in the last column runs the band to the ${out} edge`);
    assert.deepEqual(await bleed('2026-09-13'), { edge: back, width: 12, top: '4px', height: '40px', colour: secondary }, `${label}: a middle day in the first column runs it from the ${back} edge`);
    for (const date of ['2026-09-09', '2026-09-11', '2026-09-17']) assert.equal(await bleed(date), null, `${label}: no bleed off the edges or at the endpoints (${date})`);
  };
  await wraps('modal');
  await page.screenshot({ path: join(artifacts, 'datepicker-range-wrap-modal.png'), animations: 'disabled' });
  // The endpoints bleed only on the side the range goes on: a start out of the last
  // column, an end into the first; never an end out or a start in, nor a one-day range.
  await remount({ variant: 'modal', selectionMode: 'range', value: ['2026-09-12', '2026-09-13'] });
  assert.equal((await bleed('2026-09-12'))?.edge, 'right', 'a start in the last column runs the band to the edge');
  assert.equal((await bleed('2026-09-13'))?.edge, 'left', 'an end in the first column runs the band from the edge');
  await remount({ variant: 'modal', selectionMode: 'range', value: ['2026-09-10', '2026-09-12'] });
  assert.equal(await bleed('2026-09-12'), null, 'an end in the last column has no bleed');
  await remount({ variant: 'modal', selectionMode: 'range', value: ['2026-09-13', '2026-09-15'] });
  assert.equal(await bleed('2026-09-13'), null, 'a start in the first column has no bleed');
  await remount({ variant: 'modal', selectionMode: 'range', value: ['2026-09-12', '2026-09-12'] });
  assert.equal(await bleed('2026-09-12'), null, 'a one-day range has no band and no bleed');
  // Docked and right to left (the first and last columns are the right and left edges).
  await remount({ selectionMode: 'range', value: ['2026-09-09', '2026-09-17'] });
  await wraps('docked');
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await remount({ variant: 'modal', selectionMode: 'range', value: ['2026-09-09', '2026-09-17'] });
  await wraps('right to left', true);
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  await remount({ variant: 'fullscreen', selectionMode: 'range', value: ['2026-09-09', '2026-09-17'] });
  await wraps('full screen');
  assert.equal(await page.locator('.mtrl-datepicker__list').evaluate(el => el.scrollWidth <= el.clientWidth), true, 'full screen: the bleed stays inside the list');
  await page.screenshot({ path: join(artifacts, 'datepicker-range-wrap-fullscreen.png'), animations: 'disabled' });
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await remount({ variant: 'modal', value: '2026-09-15' });
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date), '2026-09-14', 'right to left, ArrowRight goes back a day');
  assert.equal(await page.locator('[data-action="next"] svg').evaluate(el => getComputedStyle(el).transform), 'matrix(-1, 0, 0, 1, 0, 0)', 'right to left, the chevrons mirror');
  await page.evaluate(() => { document.documentElement.dir = 'ltr'; });
  // Inside a shadow root, as in a web component. The document sees only
  // the host there, so focus is read from the picker's own root.
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow; state.picker.destroy();
    // A focusable host, as custom elements often are: reading the document's
    // active element, the picker returned focus to the host, not to the opener.
    const host = document.createElement('div'); host.id = 'date-host'; host.tabIndex = -1; document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    for (const style of document.querySelectorAll('style')) root.append(style.cloneNode(true));
    const opener = document.createElement('button'); opener.id = 'shadow-opener'; opener.textContent = 'Pick a date'; root.append(opener);
    state.picker = state.core.createDatePicker({ variant: 'modal', value: '2026-09-15' }); root.append(state.picker.element);
    opener.focus(); state.picker.open();
  });
  const shadowFocus = () => page.evaluate(() => { const active = document.getElementById('date-host')!.shadowRoot!.activeElement as HTMLElement | null; return active ? active.dataset.date || active.id || active.getAttribute('aria-label') || active.textContent : null; });
  const ends = await page.evaluate(() => {
    const dialog = document.getElementById('date-host')!.shadowRoot!.querySelector('dialog')!;
    const elements = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), input:not(:disabled)'));
    const name = (element: HTMLElement) => element.dataset.date || element.id || element.getAttribute('aria-label') || element.textContent;
    elements.at(-1)!.focus();
    return [name(elements[0]), name(elements.at(-1)!)];
  });
  await page.keyboard.press('Tab');
  assert.equal(await shadowFocus(), ends[0], 'in a shadow root, Tab from the last control wraps to the first');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await shadowFocus(), ends[1], 'and Shift+Tab from the first wraps to the last');
  await page.locator('[data-date="2026-09-15"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.locator('.mtrl-datepicker__track').evaluate(el => { el.scrollLeft = el.clientWidth * 2; });
  await page.waitForFunction(() => /^2026-10/.test((document.getElementById('date-host')!.shadowRoot!.activeElement as HTMLElement | null)?.dataset.date ?? ''));
  assert.equal(await shadowFocus(), '2026-10-16', 'a swipe with a day focused keeps a day focused, in the new month');
  await page.keyboard.press('Escape');
  assert.equal(await shadowFocus(), 'shadow-opener', 'closing returns focus to the opener inside the shadow root');
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow; state.picker.destroy();
    state.picker = state.core.createDatePicker({ variant: 'fullscreen', value: '2026-09-15' }); document.getElementById('date-host')!.shadowRoot!.append(state.picker.element); state.picker.open();
  });
  await page.locator('[data-date="2026-09-15"]').focus();
  await page.locator('.mtrl-datepicker__list').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.waitForFunction(() => document.querySelector('#date-host')!.shadowRoot!.querySelectorAll('[data-month-key]').length > 25);
  assert.equal(await shadowFocus(), '2026-09-15', 'the full-screen list grows without losing the focused day');
  await page.evaluate(() => { (window as unknown as PickerWindow).picker.destroy(); document.getElementById('date-host')?.remove(); });
  assert.equal(await page.locator('.mtrl-datepicker').count(), 0);
  console.log('Passed packed date picker: selective CSS, token geometry, native modal/scrim, focus, keyboard, input validation, draft/commit/cancel, range, themes, mobile, month swiping in both directions, the scrolling year list, the full-screen range picker, M3 day states, corners, colours, the range band and its bleed where it wraps a week (modal, docked, full screen, right to left), right-to-left keys, focus inside a shadow root (Tab wrap, swipe, list growth, focus return) and cleanup.');
}

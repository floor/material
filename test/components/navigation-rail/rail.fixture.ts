import { beforeEach, afterEach, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import createNavigationRail from '../../../src/components/navigation-rail';
import { clearGlobalDefaults, setComponentDefaults } from '../../../src/core/config/global';
import { setIcons } from '../../../src/core/icons/registry';
let dom: JSDOM;
let rails: ReturnType<typeof createNavigationRail>[];
beforeEach(() => {
    dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true, url: 'https://example.test' });
    for (const name of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent'])
        Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === 'window' ? dom.window : Reflect.get(dom.window, name) });
    rails = [];
});
afterEach(() => {
    rails.forEach(rail => rail.destroy());
    dom.window.close();
    setIcons({ menu: null, 'menu-open': null });
    clearGlobalDefaults();
});
const make = (config: Parameters<typeof createNavigationRail>[0] = {}) => {
    const rail = createNavigationRail({ items: [{ id: 'home', label: 'Home', icon: '<svg></svg>', active: true }, { id: 'mail', label: 'Mail', icon: '<svg></svg>', href: '/mail' }], ...config });
    document.body.append(rail.element);
    rails.push(rail);
    return rail;
};
test('standalone navigation exposes links and current destination, not tabs', () => {
    const rail = make();
    expect(rail.element.tagName).toBe('NAV');
    expect(rail.element.querySelector('[role="tab"]')).toBeNull();
    expect(rail.element.querySelector('[data-id="home"]')?.getAttribute('aria-current')).toBe('page');
    expect(rail.element.querySelector('a')?.getAttribute('href')).toBe('/mail');
});
test('expansion keeps destination nodes and focus and emits only on changes', () => {
    let changes = 0;
    const rail = make({ onExpand: () => changes++ });
    const item = rail.element.querySelector<HTMLElement>('[data-id="home"]')!;
    item.focus();
    rail.expand().expand();
    expect(changes).toBe(1);
    expect(rail.isExpanded()).toBe(true);
    expect(document.activeElement).toBe(item);
    expect(rail.element.querySelector('[data-id="home"]')).toBe(item);
    rail.collapse();
    expect(rail.isExpanded()).toBe(false);
});
test('keyboard moves focus past disabled items without changing selection', () => {
    const rail = make({ items: [{ id: 'a', label: 'A', icon: 'A', active: true }, { id: 'b', label: 'B', icon: 'B', disabled: true }, { id: 'c', label: 'C', icon: 'C' }] });
    const a = rail.element.querySelector<HTMLElement>('[data-id="a"]')!;
    a.focus();
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect((document.activeElement as HTMLElement).dataset.id).toBe('c');
    expect(rail.getActive()).toBe('a');
});
test('selection swaps icons and modified link clicks preserve current page', () => {
    const rail = make({ items: [{ id: 'a', label: 'A', icon: 'outline', activeIcon: 'filled', active: true }, { id: 'b', label: 'B', icon: 'B', href: '/b' }] });
    expect(rail.element.querySelector('[data-id="a"]')?.textContent).toContain('filled');
    rail.element.querySelector('a')!.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true, cancelable: true }));
    expect(rail.getActive()).toBe('a');
    rail.setActive('b');
    expect(rail.element.querySelector('[data-id="a"]')?.textContent).toContain('outline');
});
test('select carries value, the id, as the element change does', () => {
    const selected: unknown[] = [];
    const rail = make({ items: [{ id: 'a', label: 'A', icon: 'A', active: true }, { id: 'b', label: 'B', icon: 'B' }] });
    rail.on('select', (event) => selected.push([event.id, event.value, rail.getValue()]));
    (rail.element.querySelector('[data-id="b"]') as HTMLElement).click();
    expect(selected).toEqual([['b', 'b', 'b']]);
});
test('select carries the exact detail: the id as value, its index, and the click itself', () => {
    const details: Record<string, unknown>[] = [];
    const rail = make();
    rail.on('select', (event) => details.push(event as unknown as Record<string, unknown>));
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    rail.element.querySelector<HTMLElement>('[data-id="home"]')!.dispatchEvent(click);
    expect(Object.keys(details[0]!)).toEqual(['id', 'value', 'index', 'originalEvent']);
    expect([details[0]!.id, details[0]!.value, details[0]!.index]).toEqual(['home', 'home', 0]);
    expect(details[0]!.originalEvent).toBe(click);
});

test('items are copied, badges update without losing focus, invalid IDs preserve selection', () => {
    const items = [{ id: 'a"b', label: 'Home', icon: 'H', active: true }];
    const rail = make({ items });
    items[0].label = 'Changed';
    const item = rail.element.querySelector<HTMLElement>('[data-id]')!;
    item.focus();
    rail.setBadge('a"b', '8');
    expect(item.textContent).toContain('Home');
    expect(item.textContent).toContain('8');
    expect(document.activeElement).toBe(item);
    rail.setActive('missing');
    expect(rail.getActive()).toBe('a"b');
    expect(() => rail.setItems([{ id: 'x', label: 'X', icon: 'X' }, { id: 'x', label: 'Y', icon: 'Y' }])).toThrow();
    expect(rail.getActive()).toBe('a"b');
});
test('destroy releases interaction, supports repeated calls, and cannot restart', () => {
    let calls = 0;
    const rail = make({ onSelect: () => calls++ });
    const item = rail.element.querySelector<HTMLButtonElement>('[data-id="home"]')!;
    rail.destroy();
    rail.destroy();
    item.click();
    rail.expand();
    expect(calls).toBe(0);
    expect(rail.element.isConnected).toBe(false);
    expect(rail.isExpanded()).toBe(false);
});
test('replacing items normalizes selection and moves focus away from a newly disabled destination', () => {
    const rail = make();
    rail.element.querySelector<HTMLElement>('[data-id="home"]')!.focus();
    rail.setItems([{ id: 'home', label: 'Home', icon: 'H', disabled: true, active: true }, { id: 'next', label: 'Next', icon: 'N', active: true }, { id: 'last', label: 'Last', icon: 'L', active: true }]);
    expect(rail.getActive()).toBe('next');
    expect((document.activeElement as HTMLElement).dataset.id).toBe('next');
    expect(rail.element.querySelectorAll('[aria-current="page"]').length).toBe(1);
});

test('with no enabled destination left after a replacement, focus falls back to the toggle', () => {
    const rail = make();
    rail.element.querySelector<HTMLElement>('[data-id="mail"]')!.focus();
    rail.setItems([{ id: 'home', label: 'Home', icon: 'H', active: true, disabled: true }]);
    expect(document.activeElement).toBe(rail.element.querySelector('.mtrl-navigation-rail__toggle'));
});

test('a select listener can replace the items or destroy the rail during the emit', () => {
    const rail = make();
    rail.on('select', () => rail.setItems([{ id: 'next', label: 'Next', icon: 'N' }]));
    rail.element.querySelector<HTMLElement>('[data-id="home"]')!.click();
    expect(rail.getItems().map((entry) => entry.id)).toEqual(['next']);
    expect([...rail.element.querySelectorAll<HTMLElement>('.mtrl-navigation-rail__item')].map((element) => element.dataset.id)).toEqual(['next']);
    const doomed = make();
    let destroyed = 0;
    doomed.on('select', () => { doomed.destroy(); destroyed++; });
    expect(() => doomed.element.querySelector<HTMLElement>('[data-id="home"]')!.click()).not.toThrow();
    expect([destroyed, doomed.element.isConnected]).toEqual([1, false]);
});
test('hidden collapsed rails are inert and show their optional header on expansion', () => {
    const header = document.createElement('button');
    header.textContent = 'Compose';
    const rail = make({ hideWhenCollapsed: true, showToggle: false, header });
    expect(rail.element.hasAttribute('inert')).toBe(true);
    rail.expand();
    expect(rail.element.hasAttribute('inert')).toBe(false);
    expect(rail.element.contains(header)).toBe(true);
    rail.destroy();
    expect(header.textContent).toBe('Compose');
});
test('press ripples are removed on animation completion and destroy', () => {
    const rail = make();
    const item = rail.element.querySelector<HTMLElement>('[data-id="home"]')!;
    item.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    const wave = rail.element.querySelector('.mtrl-navigation-rail__ripple')!;
    expect(wave).not.toBeNull();
    wave.dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(rail.element.querySelector('.mtrl-navigation-rail__ripple')).toBeNull();
    item.dispatchEvent(new MouseEvent('pointerdown', { button: 0, bubbles: true }));
    rail.destroy();
    expect(rail.element.querySelector('.mtrl-navigation-rail__ripple')).toBeNull();
});
test('menu button swaps between the menu and menu_open icons and accepts custom ones', () => {
    const rail = make();
    const toggle = rail.element.querySelector<HTMLElement>('.mtrl-navigation-rail__toggle')!;
    const collapsedIcon = toggle.innerHTML;
    expect(collapsedIcon).toContain('<svg');
    rail.expand();
    expect(toggle.innerHTML).not.toBe(collapsedIcon);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    rail.collapse();
    expect(toggle.innerHTML).toBe(collapsedIcon);
    const custom = make({ expandIcon: '<i>open</i>', collapseIcon: '<i>close</i>' });
    const customToggle = custom.element.querySelector<HTMLElement>('.mtrl-navigation-rail__toggle')!;
    expect(customToggle.innerHTML).toBe('<i>open</i>');
    custom.expand();
    expect(customToggle.innerHTML).toBe('<i>close</i>');
});
test('expansion marks the rail as switching for the spring duration, not at mount', async () => {
    const rail = make({ expanded: true });
    expect(rail.element.classList.contains('mtrl-navigation-rail--switching')).toBe(false);
    rail.collapse();
    expect(rail.element.classList.contains('mtrl-navigation-rail--switching')).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(rail.element.classList.contains('mtrl-navigation-rail--switching')).toBe(false);
    rail.expand();
    rail.destroy();
    expect(rail.element.classList.contains('mtrl-navigation-rail--switching')).toBe(false);
});
test('items carry a badged class only while they show a large badge', () => {
    const rail = make();
    const item = rail.element.querySelector<HTMLElement>('[data-id="home"]')!;
    expect(item.classList.contains('mtrl-navigation-rail__item--badged')).toBe(false);
    rail.setBadge('home', 12);
    expect(item.classList.contains('mtrl-navigation-rail__item--badged')).toBe(true);
    rail.setBadge('home', true);
    expect(item.classList.contains('mtrl-navigation-rail__item--badged')).toBe(false);
    rail.setBadge('home', 3);
    rail.setBadge('home', undefined);
    expect(item.classList.contains('mtrl-navigation-rail__item--badged')).toBe(false);
    expect(item.querySelector('.mtrl-navigation-rail__badge')).toBeNull();
});

test('a badge says what it shows: capped at 999+, empty or zero cleared, the dot announcing New notification', () => {
    const rail = make();
    const item = rail.element.querySelector<HTMLElement>('[data-id="home"]')!;
    rail.setBadge('home', 1000);
    expect([item.querySelector('.mtrl-navigation-rail__badge')?.textContent, item.getAttribute('aria-label')]).toEqual(['1000', 'Home, 1000']);
    rail.setBadge('home', 10000);
    expect([item.querySelector('.mtrl-navigation-rail__badge')?.textContent, item.getAttribute('aria-label')]).toEqual(['999+', 'Home, 999+']);
    rail.setBadge('home', 0);
    expect([item.querySelector('.mtrl-navigation-rail__badge'), item.getAttribute('aria-label')]).toEqual([null, 'Home']);
    rail.setBadge('home', true);
    expect(item.getAttribute('aria-label')).toBe('Home, New notification');
    rail.setBadge('home', 12);
    expect([item.querySelector('.mtrl-navigation-rail__badge')?.textContent, item.getAttribute('aria-label')]).toEqual(['12', 'Home, 12']);
});

// The Material Symbols strings the rail draws with no override, as the DOM
// serializes them (a self-closing `path` comes back closed). A changed
// built-in fails here instead of shipping silently.
const MENU_GLYPH = '<svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"></path></svg>';
const MENU_OPEN_GLYPH = '<svg viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path d="M120-240v-80h520v80H120Zm664-40L584-480l200-200 56 56-144 144 144 144-56 56ZM120-440v-80h400v80H120Zm0-200v-80h520v80H120Z"></path></svg>';
const toggleOf = (rail: ReturnType<typeof make>) => rail.element.querySelector<HTMLElement>('.mtrl-navigation-rail__toggle')!;

test('the toggle draws the exact built-in glyphs while the registry is empty', () => {
    const rail = make();
    expect(toggleOf(rail).innerHTML).toBe(MENU_GLYPH);
    rail.expand();
    expect(toggleOf(rail).innerHTML).toBe(MENU_OPEN_GLYPH);
});

test('an icon comes from the instance, then component defaults, then the registry, then the built-in', () => {
    setIcons({ menu: '<i>registry-menu</i>', 'menu-open': '<i>registry-open</i>' });
    const fromRegistry = make();
    expect(toggleOf(fromRegistry).innerHTML).toBe('<i>registry-menu</i>');
    fromRegistry.expand();
    expect(toggleOf(fromRegistry).innerHTML).toBe('<i>registry-open</i>');

    setComponentDefaults('navigation-rail', { expandIcon: '<i>component-menu</i>', collapseIcon: '<i>component-open</i>' });
    const fromDefaults = make();
    expect(toggleOf(fromDefaults).innerHTML).toBe('<i>component-menu</i>');
    fromDefaults.expand();
    expect(toggleOf(fromDefaults).innerHTML).toBe('<i>component-open</i>');

    const fromInstance = make({ expandIcon: '<i>instance-menu</i>', collapseIcon: '<i>instance-open</i>' });
    expect(toggleOf(fromInstance).innerHTML).toBe('<i>instance-menu</i>');
    fromInstance.expand();
    expect(toggleOf(fromInstance).innerHTML).toBe('<i>instance-open</i>');
});

test('a rail reads the registry when it is created, not when it draws', () => {
    const created = make();
    setIcons({ menu: '<i>later</i>' });
    expect(toggleOf(created).innerHTML).toBe(MENU_GLYPH);
    created.expand();
    created.collapse();
    expect(toggleOf(created).innerHTML).toBe(MENU_GLYPH);
    expect(toggleOf(make()).innerHTML).toBe('<i>later</i>');
});

import { afterEach, beforeEach, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import createButtonGroup from '../../../src/components/button-group';
import createCard from '../../../src/components/card';
import createDrawer from '../../../src/components/drawer';
import createCarousel from '../../../src/components/carousel';
import { PREFIX } from '../../../src/core/config';

let dom: JSDOM;
let components: Array<{ element: HTMLElement; destroy: () => void }>;
beforeEach(() => {
  dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent']) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === 'window' ? dom.window : Reflect.get(dom.window, name) });
  }
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  components = [];
});
afterEach(() => { components.forEach(c => c.destroy()); dom.window.close(); });
const attach = <T extends { element: HTMLElement; destroy: () => void }>(component: T): T => {
  document.body.append(component.element); components.push(component); return component;
};
const propertyNames = (element: HTMLElement) => Array.from(element.style).filter(name => name.startsWith('--'));

for (const prefix of [PREFIX]) {
  test(`${prefix}: button-group geometry properties track size and density`, () => {
    const group = attach(createButtonGroup({ prefix, kind: 'connected', size: 'm', buttons: [{ text: 'Day' }] }));
    const name = (suffix: string) => `--${prefix}-button-group-${suffix}`;
    const base = ['height', 'icon', 'gap', 'inner-corner', 'pressed-corner'].map(name);
    expect(propertyNames(group.element).sort()).toEqual(base.sort());
    expect(group.element.style.getPropertyValue(name('height'))).toBe('56px');
    expect(group.element.style.getPropertyValue(name('icon'))).toBe('24px');
    expect(group.element.style.getPropertyValue(name('gap'))).toBe('2px');
    expect(group.element.style.getPropertyValue(name('inner-corner'))).toBe(`var(--${prefix}-sys-shape-corner-small, 8px)`);
    expect(group.element.style.getPropertyValue(name('pressed-corner'))).toBe(`var(--${prefix}-sys-shape-corner-extra-small, 4px)`);
    // The radius is derived in the stylesheet from the scaled height, so the
    // density step is the only property the option adds; the height stays the
    // size's base and the stylesheet lowers it.
    group.setDensity('compact');
    expect(group.element.style.getPropertyValue(name('height'))).toBe('56px');
    expect(group.element.style.getPropertyValue(`--${prefix}-density`)).toBe('-2');
    expect(propertyNames(group.element).sort()).toEqual([...base, `--${prefix}-density`].sort());
  });

  // The card's --card-elevation writes were read by no stylesheet
  // and are gone; elevation is its classes.
  test(`${prefix}: the card writes no custom property, at creation, hover or drag`, () => {
    const card = attach(createCard({ prefix, variant: 'elevated', interactive: true, draggable: true }));
    expect(propertyNames(card.element)).toEqual([]);
    for (const event of ['mouseenter', 'mouseleave', 'dragstart', 'dragend']) {
      card.element.dispatchEvent(new Event(event));
      expect(propertyNames(card.element)).toEqual([]);
    }
  });

  test(`${prefix}: drawer width is written under the configured name`, () => {
    const drawer = attach(createDrawer({ prefix, width: 312, items: [] }));
    expect(propertyNames(drawer.element)).toEqual([`--${prefix}-drawer-width`]);
    expect(drawer.element.style.getPropertyValue(`--${prefix}-drawer-width`)).toBe('312px');
  });

  test(`${prefix}: carousel writes its corner and item fade after layout`, () => {
    const carousel = attach(createCarousel({ prefix, cornerRadius: 19, slides: Array.from({ length: 5 }, () => ({ content: '<p>Slide</p>' })) }));
    const scroller = carousel.element.querySelector(`.${prefix}-carousel__scroller`)!;
    Object.defineProperty(scroller, 'clientWidth', { configurable: true, value: 800 });
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 200 });
    carousel.addSlide({ content: '<p>Next</p>' });
    expect(propertyNames(carousel.element)).toEqual([`--${prefix}-carousel-corner`]);
    expect(carousel.element.style.getPropertyValue(`--${prefix}-carousel-corner`)).toBe('19px');
    for (const item of carousel.element.querySelectorAll<HTMLElement>(`.${prefix}-carousel__item`)) {
      expect(propertyNames(item)).toEqual([`--${prefix}-carousel-inset`, `--${prefix}-carousel-fade`]);
      expect(Number(item.style.getPropertyValue(`--${prefix}-carousel-fade`))).toBeGreaterThanOrEqual(0);
    }
  });
}

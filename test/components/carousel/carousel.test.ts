// test/components/carousel/carousel.test.ts
import { corner } from '../../utils/corner';
import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { JSDOM } from 'jsdom';

let dom: JSDOM;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.Event = dom.window.Event;
  g.KeyboardEvent = dom.window.KeyboardEvent;
  g.FocusEvent = dom.window.FocusEvent;
  g.CustomEvent = dom.window.CustomEvent;
  g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
  g.cancelAnimationFrame = (id: number) => clearTimeout(id);
  g.ResizeObserver = class { observe() {} disconnect() {} };
});

afterEach(() => {
  dom.window.close();
});

import { createCarousel, type CarouselEvents, type CarouselChangePayload } from '../../../src/components/carousel';

const slides = [
  { image: 'a.jpg', title: 'Alpha' },
  { image: 'b.jpg', title: 'Beta', alt: '' },
  { image: 'c.jpg', title: 'Gamma', description: 'Third', buttonText: 'Open', buttonUrl: '/c' },
  { content: '<p>Custom</p>' },
];

/** JSDOM has no layout: give the scroller a size */
const sized = (carousel: ReturnType<typeof createCarousel>, width: number) => {
  const scroller = carousel.element.querySelector('.mtrl-carousel__scroller') as HTMLElement;
  Object.defineProperty(scroller, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(scroller, 'clientHeight', { value: 200, configurable: true });
  return scroller;
};

describe('carousel', () => {
  test('renders a labelled region with one focusable slide per item', () => {
    const carousel = createCarousel({ slides, ariaLabel: 'Featured' });
    const el = carousel.element;
    expect(el.classList.contains('mtrl-carousel')).toBe(true);
    expect(el.classList.contains('mtrl-carousel--multi-browse')).toBe(true);
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-roledescription')).toBe('carousel');
    expect(el.getAttribute('aria-label')).toBe('Featured');
    expect(el.hasAttribute('aria-live')).toBe(false);

    const items = el.querySelectorAll('.mtrl-carousel__item');
    expect(items.length).toBe(4);
    expect(items[0]!.getAttribute('role')).toBe('group');
    expect(items[0]!.getAttribute('aria-roledescription')).toBe('slide');
    expect(items[0]!.getAttribute('aria-label')).toBe('1 of 4');
    expect(items[3]!.getAttribute('aria-label')).toBe('4 of 4');
    expect(items[0]!.getAttribute('tabindex')).toBe('0');
    expect(items[0]!.getAttribute('style') ?? '').not.toContain('position');
  });

  test('image alt text: the title by default, empty when the image is decorative', () => {
    const carousel = createCarousel({ slides });
    const images = carousel.element.querySelectorAll('img');
    expect(images[0]!.alt).toBe('Alpha');
    expect(images[1]!.alt).toBe('');
    expect(carousel.element.querySelector('.mtrl-carousel__button')!.getAttribute('href')).toBe('/c');
    expect(carousel.element.querySelectorAll('.mtrl-carousel__item')[3]!.innerHTML).toBe('<p>Custom</p>');
  });

  test('layout defaults per variant: full-screen is vertical with no padding, uncontained does not snap', () => {
    const full = createCarousel({ variant: 'full-screen', slides });
    expect(full.element.classList.contains('mtrl-carousel--vertical')).toBe(true);
    expect(full.getVariant()).toBe('full-screen');
    const uncontained = createCarousel({ variant: 'uncontained', slides });
    expect(uncontained.element.classList.contains('mtrl-carousel--snap')).toBe(false);
    expect(createCarousel({ variant: 'uncontained', snap: true, slides }).element.classList.contains('mtrl-carousel--snap')).toBe(true);
  });

  test('without a measurable container the index stays a number', () => {
    const carousel = createCarousel({ slides });
    expect(carousel.getCurrentSlide()).toBe(0);
    carousel.next();
    expect(carousel.getCurrentSlide()).toBe(1);
    carousel.goTo(99);
    expect(carousel.getCurrentSlide()).toBe(3);
    carousel.goTo(-5);
    expect(carousel.getCurrentSlide()).toBe(0);
  });

  test('a corner radius given in the config stays as given (FLO-331)', () => {
    const carousel = createCarousel({ slides, cornerRadius: 12 });
    sized(carousel, 600);
    carousel.addSlide({ image: 'd.jpg' });
    expect(carousel.element.style.getPropertyValue('--mtrl-carousel-corner')).toBe('12px');
    const items = carousel.element.querySelectorAll<HTMLElement>('.mtrl-carousel__item');
    expect(items[0]!.style.clipPath).toContain('round 12px');
  });

  test('with a container: one snap point per item, items sized to the large keyline, change events', () => {
    const carousel = createCarousel({ slides, initialSlide: 1 });
    const scroller = sized(carousel, 600);
    const scrollTo = mock((_: ScrollToOptions) => undefined);
    (scroller as any).scrollTo = scrollTo;
    // a resize would do this in the browser; JSDOM never fires ResizeObserver
    carousel.addSlide({ image: 'd.jpg' });
    expect(carousel.element.classList.contains('mtrl-carousel--snap')).toBe(true);
    const snaps = carousel.element.querySelectorAll('.mtrl-carousel__snap');
    expect(snaps.length).toBe(5);
    expect((snaps[0] as HTMLElement).style.left).toBe('0px');
    const items = carousel.element.querySelectorAll<HTMLElement>('.mtrl-carousel__item');
    expect(parseFloat(items[0]!.style.width)).toBeGreaterThan(200);
    // The default corner reads the extra-large token (FLO-331)
    expect(items[0]!.style.clipPath).toContain(`round ${corner(28)}`);
    expect(carousel.element.style.getPropertyValue('--mtrl-carousel-corner')).toBe(corner(28));
    expect(carousel.getCurrentSlide()).toBe(1);

    const changes: number[] = [];
    carousel.on('change', ({ index }: { index: number }) => changes.push(index));
    carousel.next();
    expect(changes).toEqual([2]);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: expect.any(Number), behavior: 'smooth' });
  });

  test('arrow keys move focus between items along the axis only', () => {
    const carousel = createCarousel({ slides });
    document.body.appendChild(carousel.element);
    const scroller = sized(carousel, 600);
    carousel.addSlide({ image: 'd.jpg' });
    const items = carousel.element.querySelectorAll<HTMLElement>('.mtrl-carousel__item');
    items[0]!.focus();
    items[0]!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    expect(carousel.getCurrentSlide()).toBe(1);
    items[1]!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    items[1]!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(items[4]);
    expect(scroller.contains(document.activeElement)).toBe(true);
  });

  test('removing and updating slides relabels them', () => {
    const carousel = createCarousel({ slides });
    carousel.removeSlide(0);
    const items = carousel.element.querySelectorAll('.mtrl-carousel__item');
    expect(items.length).toBe(3);
    expect(items[0]!.getAttribute('aria-label')).toBe('1 of 3');
    carousel.slides.updateSlide(0, { image: 'z.jpg', title: 'Zeta' });
    expect(items[0]!.querySelector('.mtrl-carousel__title')!.textContent).toBe('Zeta');
    expect(carousel.slides.getSlide(0)?.title).toBe('Zeta');
  });

  test('does not trap the wheel', () => {
    const carousel = createCarousel({ slides });
    const scroller = carousel.element.querySelector('.mtrl-carousel__scroller')!;
    const wheel = new dom.window.Event('wheel', { bubbles: true, cancelable: true });
    scroller.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(false);
  });

  test('destroy removes the element', () => {
    const carousel = createCarousel({ slides });
    document.body.appendChild(carousel.element);
    carousel.destroy();
    expect(document.body.children.length).toBe(0);
  });
});


// FLO-114: the real emitter behind the public event map.
describe('carousel event contract', () => {
  test('navigation emits only index changes, clamps boundaries and supports off', () => {
    const carousel = createCarousel({ slides });
    const changed = mock((_payload: CarouselChangePayload) => {});
    try {
      expect(carousel.on('change', changed)).toBe(carousel);
      carousel.goTo(0).next().goTo(1).goTo(99).next().prev().goTo(-5).prev();
      expect(changed.mock.calls).toEqual([[{ index: 1 }], [{ index: 3 }], [{ index: 2 }], [{ index: 0 }]]);
      expect(carousel.off('change', changed)).toBe(carousel);
      carousel.next();
      expect(changed).toHaveBeenCalledTimes(4);
    } finally { carousel.destroy(); }
  });

  for (const variant of ['uncontained', 'full-screen'] as const) {
    test(`${variant} native scrolling emits the same index payload`, () => {
      const carousel = createCarousel({ slides, variant });
      const changed = mock((_payload: CarouselChangePayload) => {});
      try {
        const scroller = sized(carousel, 600);
        carousel.addSlide({ title: 'Last' });
        carousel.on('change', changed);
        // A wheel gesture clears the pending programmatic target set during layout.
        scroller.dispatchEvent(new dom.window.Event('wheel'));
        const snaps = carousel.element.querySelectorAll<HTMLElement>('.mtrl-carousel__snap');
        const last = snaps[snaps.length - 1];
        expect(snaps.length).toBe(5);
        if (variant === 'full-screen') scroller.scrollTop = parseFloat(last.style.top);
        else scroller.scrollLeft = parseFloat(last.style.left);
        scroller.dispatchEvent(new dom.window.Event('scroll'));
        scroller.dispatchEvent(new dom.window.Event('scroll'));
        expect(changed.mock.calls).toEqual([[{ index: 4 }]]);
        expect(carousel.getCurrentSlide()).toBe(4);
      } finally { carousel.destroy(); }
    });
  }

  test('focus and blur preserve root event identity; slide focus is not forwarded', () => {
    const carousel = createCarousel({ slides });
    const focused = mock((..._args: Parameters<CarouselEvents['focus']>) => {});
    const blurred = mock((..._args: Parameters<CarouselEvents['blur']>) => {});
    document.body.append(carousel.element);
    try {
      carousel.on('focus', focused).on('blur', blurred);
      const focus = new dom.window.FocusEvent('focus');
      const blur = new dom.window.FocusEvent('blur');
      carousel.element.dispatchEvent(focus);
      carousel.element.dispatchEvent(blur);
      expect(focused.mock.calls).toEqual([[{ event: focus, originalEvent: focus, element: carousel.element }]]);
      expect(blurred.mock.calls).toEqual([[{ event: blur, originalEvent: blur, element: carousel.element }]]);
      expect(focused.mock.calls[0][0].event).toBe(focus);
      expect(blurred.mock.calls[0][0].originalEvent).toBe(blur);
      carousel.slides.getElements()[0].focus();
      carousel.slides.getElements()[1].focus();
      expect(focused).toHaveBeenCalledTimes(1);
      expect(blurred).toHaveBeenCalledTimes(1);
      carousel.off('focus', focused).off('blur', blurred);
      carousel.element.dispatchEvent(focus);
      carousel.element.dispatchEvent(blur);
      expect(focused).toHaveBeenCalledTimes(1);
      expect(blurred).toHaveBeenCalledTimes(1);
    } finally { carousel.destroy(); }
  });

  test('destroy clears subscriptions on retained root and navigation methods', () => {
    const carousel = createCarousel({ slides });
    const notify = mock(() => {});
    carousel.on('change', notify).on('focus', notify).on('blur', notify);
    const root = carousel.element;
    carousel.destroy();
    root.dispatchEvent(new dom.window.FocusEvent('focus'));
    root.dispatchEvent(new dom.window.FocusEvent('blur'));
    carousel.next();
    expect(notify).not.toHaveBeenCalled();
  });
});


// FLO-395: each negative case includes a positive wheel control, so the
// original implementation cannot pass simply by ignoring every wheel event.
describe('carousel opt-in wheel', () => {
  const setupWheel = (config: Parameters<typeof createCarousel>[0] = {}) => {
    const carousel = createCarousel({ slides, ...config });
    const scroller = sized(carousel, 600);
    carousel.addSlide({ title: 'Last' });
    const scroll = mock((options: ScrollToOptions) => {
      if (options.left !== undefined) scroller.scrollLeft = options.left;
      if (options.top !== undefined) scroller.scrollTop = options.top;
    });
    Object.defineProperty(scroller, 'scrollTo', { value: scroll, configurable: true });
    const wheel = (options: WheelEventInit = {}) => {
      const event = new dom.window.WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true, ...options });
      scroller.dispatchEvent(event);
      return event;
    };
    return { carousel, scroller, scroll, wheel };
  };

  test('wheel is off by default and can be enabled in place', () => {
    const { carousel, scroller, scroll, wheel } = setupWheel();
    try {
      expect(wheel().defaultPrevented).toBe(false);
      expect(scroll).not.toHaveBeenCalled();
      expect(scroller.scrollLeft).toBe(0);
      expect(carousel.setWheel(true)).toBe(carousel);
      expect(wheel().defaultPrevented).toBe(true);
      expect(scroller.scrollLeft).toBe(40);
    } finally { carousel.destroy(); }
  });

  for (const variant of ['multi-browse', 'uncontained'] as const) {
    test(`${variant} wheel normalizes pixels, lines and pages, then restores snapping`, async () => {
      const { carousel, scroller, scroll, wheel } = setupWheel({ wheel: true, variant });
      scroller.style.lineHeight = '20px';
      try {
        expect(wheel().defaultPrevented).toBe(true);
        expect(scroller.scrollLeft).toBe(40);
        wheel({ deltaY: 2, deltaMode: 1 });
        expect(scroller.scrollLeft).toBe(80);
        wheel({ deltaY: 1, deltaMode: 2 });
        expect(scroller.scrollLeft).toBe(680);
        expect(scroll).toHaveBeenLastCalledWith({ left: 680, behavior: 'auto' });
        expect(carousel.element.dataset.settling).toBe('true');
        await new Promise(resolve => setTimeout(resolve, 200));
        expect(carousel.element.dataset.settling).toBeUndefined();
        wheel({ deltaY: -40 });
        expect(scroller.scrollLeft).toBe(640);
      } finally { carousel.destroy(); }
    });
  }

  for (const variant of ['hero', 'hero-center'] as const) {
    test(`${variant} moves one slide per burst and rearms after quiet`, async () => {
      const { carousel, wheel, scroll } = setupWheel({ wheel: true, variant });
      try {
        expect(wheel().defaultPrevented).toBe(true);
        wheel(); wheel();
        expect(carousel.getCurrentSlide()).toBe(1);
        expect(scroll).toHaveBeenCalledTimes(1);
        await new Promise(resolve => setTimeout(resolve, 200));
        wheel({ deltaY: -40 });
        expect(carousel.getCurrentSlide()).toBe(0);
        expect(scroll).toHaveBeenCalledTimes(2);
      } finally { carousel.destroy(); }
    });
  }

  test('last slide passes wheel down through and start passes wheel up through', () => {
    const { carousel, wheel, scroll } = setupWheel({ wheel: true, variant: 'hero' });
    try {
      expect(wheel({ deltaY: -40 }).defaultPrevented).toBe(false);
      // A distinct gesture after the edge event.
      carousel.setWheel(true);
      expect(wheel().defaultPrevented).toBe(true);
      carousel.goTo(4);
      scroll.mockClear();
      expect(wheel().defaultPrevented).toBe(false);
      expect(scroll).not.toHaveBeenCalled();
    } finally { carousel.destroy(); }
  });

  test('horizontal/equal deltas and ctrl zoom are ignored while enabled', () => {
    const { carousel, wheel, scroll } = setupWheel({ wheel: true });
    try {
      for (const options of [{ deltaX: 50 }, { deltaX: -40 }, { ctrlKey: true }]) {
        expect(wheel(options).defaultPrevented).toBe(false);
      }
      expect(scroll).not.toHaveBeenCalled();
      expect(wheel().defaultPrevented).toBe(true);
      expect(scroll).toHaveBeenCalledTimes(1);
    } finally { carousel.destroy(); }
  });

  test('turning wheel off removes only the opt-in listener; destroy removes it too', () => {
    const { carousel, scroller, scroll, wheel } = setupWheel();
    const add = spyOn(scroller, 'addEventListener');
    const remove = spyOn(scroller, 'removeEventListener');
    try {
      carousel.setWheel(true);
      const registration = add.mock.calls.find(([type]) => type === 'wheel')!;
      expect(registration[2]).toEqual({ passive: false });
      expect(wheel().defaultPrevented).toBe(true);
      carousel.setWheel(false);
      expect(remove).toHaveBeenCalledWith('wheel', registration[1]);
      scroll.mockClear();
      expect(wheel().defaultPrevented).toBe(false);
      expect(scroll).not.toHaveBeenCalled();
      // The existing passive listener still releases a programmatic target.
      carousel.goTo(0);
      wheel();
      scroller.scrollLeft = 10000;
      scroller.dispatchEvent(new dom.window.Event('scroll'));
      expect(carousel.getCurrentSlide()).toBe(4);
      carousel.setWheel(true);
      remove.mockClear();
      carousel.destroy();
      expect(remove).toHaveBeenCalledWith('wheel', registration[1]);
      scroll.mockClear();
      expect(wheel({ deltaY: -40 }).defaultPrevented).toBe(false);
      expect(scroll).not.toHaveBeenCalled();
    } finally { add.mockRestore(); remove.mockRestore(); carousel.destroy(); }
  });

  test('dragging ignores wheel input and release restores it', () => {
    const { carousel, scroller, scroll, wheel } = setupWheel({ wheel: true });
    scroller.setPointerCapture = () => {};
    scroller.hasPointerCapture = () => false;
    const down = new dom.window.MouseEvent('pointerdown', { button: 0 });
    Object.defineProperty(down, 'pointerType', { value: 'mouse' });
    try {
      scroller.dispatchEvent(down);
      expect(wheel().defaultPrevented).toBe(false);
      expect(scroll).not.toHaveBeenCalled();
      scroller.dispatchEvent(new dom.window.MouseEvent('pointerup'));
      expect(wheel().defaultPrevented).toBe(true);
    } finally { carousel.destroy(); }
  });

  test('reduced motion uses auto navigation; vertical full-screen keeps native wheel', () => {
    Object.defineProperty(dom.window, 'matchMedia', { value: () => ({ matches: true }), configurable: true });
    const hero = setupWheel({ wheel: true, variant: 'hero' });
    const vertical = setupWheel({ wheel: true, variant: 'full-screen' });
    try {
      expect(hero.wheel().defaultPrevented).toBe(true);
      expect(hero.scroll).toHaveBeenLastCalledWith({ left: expect.any(Number), behavior: 'auto' });
      expect(vertical.wheel().defaultPrevented).toBe(false);
      expect(vertical.scroll).not.toHaveBeenCalled();
    } finally { hero.carousel.destroy(); vertical.carousel.destroy(); }
  });
});

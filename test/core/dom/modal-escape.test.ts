// test/core/dom/modal-escape.test.ts
//
// onModalEscape (FLO-548 family 6, FLO-556): Escape for the modals, handled as
// a key press. One bubble listener on the window serves a stack of modals:
// it prevents the key (so the browser sends a modal <dialog> no `cancel`, and
// its allowance of two refused cancels is never spent) and tells the topmost
// one, unless that one is still in the task it opened in: the key press that
// opened a modal never dismisses it.
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import { onModalEscape } from '../../../src/core/dom/layer';

let window: JSDOM['window'];
let document: Document;
const stops: Array<() => void> = [];

beforeAll(() => {
  window = new JSDOM('<!DOCTYPE html><html><body><button id="inside">x</button></body></html>', { url: 'http://localhost/' }).window;
  document = window.document;
});
afterAll(() => window.close());
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
});

const task = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const surface = (): HTMLElement => document.body.appendChild(document.createElement('div'));
const press = (target: EventTarget, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};
/** A registered modal, and how often it was told. */
const modal = () => {
  const told: number[] = [];
  const entry = onModalEscape(surface(), () => { told.push(told.length + 1); });
  stops.push(entry.stop);
  return { entry, told };
};

describe('onModalEscape', () => {
  test('Escape on a child or on the body is prevented and tells the modal', async () => {
    const { told } = modal();
    await task();
    expect(press(document.getElementById('inside')!).defaultPrevented).toBe(true);
    expect(press(document.body).defaultPrevented).toBe(true);
    expect(told).toEqual([1, 2]);
  });

  test('in the task it opened in, the key is prevented and the modal is not told', async () => {
    const { entry, told } = modal();
    expect(entry.opening).toBe(true);
    expect(press(document.body).defaultPrevented).toBe(true);
    expect(told).toEqual([]);
    await task();
    expect(entry.opening).toBe(false);
    press(document.body);
    expect(told).toEqual([1]);
  });

  test('only the topmost modal is told; the one under it when that one has stopped', async () => {
    const under = modal();
    const over = modal();
    await task();
    press(document.body);
    expect([under.told.length, over.told.length]).toEqual([0, 1]);
    over.entry.stop();
    press(document.body);
    expect([under.told.length, over.told.length]).toEqual([1, 1]);
  });

  test('a key something inside has used, a composition being cancelled and other keys are left alone', async () => {
    const { told } = modal();
    await task();
    const inside = document.getElementById('inside')!;
    const use = (event: Event): void => event.preventDefault();
    inside.addEventListener('keydown', use);
    press(inside);
    inside.removeEventListener('keydown', use);
    expect(press(document.body, { isComposing: true }).defaultPrevented).toBe(false);
    expect(press(document.body, { key: 'Enter' }).defaultPrevented).toBe(false);
    expect(told).toEqual([]);
  });

  test('once stopped, Escape is the page\'s again; stopping twice is harmless', async () => {
    const { entry, told } = modal();
    await task();
    entry.stop();
    entry.stop();
    expect(press(document.body).defaultPrevented).toBe(false);
    expect(told).toEqual([]);
  });
});

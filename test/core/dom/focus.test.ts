// test/core/dom/focus.test.ts
//
// #244: `document.activeElement` is the shadow host when focus is inside a
// shadow root, so a component rendered in one never found its focused item.
// activeElementOf reads the node's own root; deepActiveElement follows focus
// through open shadow roots, for focus saved around an overlay.
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import { activeElementOf, deepActiveElement } from '../../../src/core/dom/focus';

const g = globalThis as unknown as Record<string, unknown>;
let previousDocument: unknown;
let document: Document;

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  previousDocument = g.document;
  document = dom.window.document;
  g.document = document;
});

afterAll(() => {
  g.document = previousDocument;
});

afterEach(() => {
  document.body.replaceChildren();
});

/** A button inside an open shadow root, focused. */
const focusedInShadow = (): { host: HTMLElement; root: ShadowRoot; button: HTMLButtonElement } => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  const button = document.createElement('button');
  root.append(button);
  button.focus();
  return { host, root, button };
};

describe('activeElementOf', () => {
  test('returns the focused element of the document for a node in it', () => {
    const button = document.createElement('button');
    const other = document.createElement('span');
    document.body.append(button, other);
    button.focus();
    expect(activeElementOf(other)).toBe(button);
  });

  test('returns the focused element of the shadow root for a node in it, not the host', () => {
    const { host, root, button } = focusedInShadow();
    const sibling = document.createElement('span');
    root.append(sibling);
    expect(document.activeElement).toBe(host);
    expect(activeElementOf(sibling)).toBe(button);
    expect(activeElementOf(button)).toBe(button);
  });

  test('returns null for a shadow root without focus inside it', () => {
    const { root } = focusedInShadow();
    const outside = document.createElement('input');
    document.body.append(outside);
    outside.focus();
    expect(activeElementOf(root)).toBeNull();
    expect(activeElementOf(outside)).toBe(outside);
  });

  test("falls back to the document's focused element for a detached node", () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    const detached = document.createElement('div');
    detached.append(document.createElement('span'));
    expect(activeElementOf(detached)).toBe(button);
    expect(activeElementOf(detached.firstChild as Node)).toBe(button);
  });
});

describe('deepActiveElement', () => {
  test('follows focus into a shadow root', () => {
    const { button } = focusedInShadow();
    expect(deepActiveElement()).toBe(button);
  });

  test('returns the focused element of the document outside any shadow root', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(deepActiveElement()).toBe(input);
  });
});

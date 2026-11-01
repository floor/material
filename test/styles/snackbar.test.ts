// test/styles/snackbar.test.ts
//
// The snackbar stylesheet against the M3 tokens (Compose SnackbarTokens.kt,
// Snackbar.kt) and the component's DOM.
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';

let css = '';

const rules = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = Array.from(css.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
  if (exact.length) return exact;
  // A direction rule compiles to a selector list — the light-DOM attribute form
  // beside the shadow tree's host-class form — so the selector is one member of
  // the prelude, not the whole of it. Commas inside `:not(:where(...))` do not
  // separate members.
  const members = (prelude: string): string[] => {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < prelude.length; i++) {
      const ch = prelude[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ',' && depth === 0) {
        out.push(prelude.slice(start, i));
        start = i + 1;
      }
    }
    out.push(prelude.slice(start));
    return out;
  };
  return Array.from(css.matchAll(/(?:^|\n)([^{}\n]+)\{([^}]*)\}/g))
    .filter((m) => members(m[1]!).map((member) => member.trim()).includes(selector))
    .map((m) => m[2]!);
};

const value = (selector: string, property: string): string | undefined =>
  rules(selector)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

beforeAll(() => {
  css = compileString(`@use 'components/snackbar';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n/g, ', ');
});

describe('snackbar stylesheet', () => {
  test('container: inverse surface, level 3, extra-small corner, 48dp for one line', () => {
    expect(value('.mtrl-snackbar', 'background-color')).toBe('var(--mtrl-sys-color-inverse-surface)');
    expect(value('.mtrl-snackbar', 'color')).toBe('var(--mtrl-sys-color-inverse-on-surface)');
    expect(value('.mtrl-snackbar', 'box-shadow')).toBe('0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15)');
    expect(value('.mtrl-snackbar', 'border-radius')).toBe('var(--mtrl-sys-shape-corner-extra-small, 4px)');
    expect(value('.mtrl-snackbar', 'min-height')).toBe('48px');
    expect(value('.mtrl-snackbar', 'max-width')).toBe('600px');
    expect(value('.mtrl-snackbar', 'padding')).toBe('0 16px');
    expect(css).not.toContain('backdrop-filter');
    expect(css).not.toMatch(/rgba\(32, 33, 36/);
  });

  test('text: body-medium, two lines at most, 14dp above and below', () => {
    expect(value('.mtrl-snackbar', 'font-size')).toBe('14px');
    expect(value('.mtrl-snackbar', 'line-height')).toBe('20px');
    expect(value('.mtrl-snackbar__text', 'margin')).toBe('14px 0');
    expect(value('.mtrl-snackbar__text', 'overflow')).toBe('hidden');
    expect(value('.mtrl-snackbar__text', '-webkit-line-clamp')).toBe('2');
  });

  test('action: inverse-primary text button, 8dp from the text and from the edge, no case change', () => {
    expect(value('.mtrl-snackbar .mtrl-button.mtrl-snackbar__action', 'color')).toBe('var(--mtrl-sys-color-inverse-primary)');
    expect(value('.mtrl-snackbar .mtrl-button.mtrl-snackbar__action:hover::before', 'background-color')).toBe('var(--mtrl-sys-color-inverse-primary)');
    expect(value('.mtrl-snackbar .mtrl-button.mtrl-snackbar__action:hover::before', 'opacity')).toBe('0.08');
    expect(value('.mtrl-snackbar--with-action', 'padding-inline-end')).toBe('8px');
    expect(value('.mtrl-snackbar--with-action .mtrl-snackbar__text, .mtrl-snackbar--dismissible .mtrl-snackbar__text', 'padding-inline-end')).toBe('8px');
    expect(css).not.toContain('text-transform');
    expect(css).not.toMatch(/rgb\(138, 180, 248\)/);
  });

  test('close icon: inverse-on-surface, flush with the edge', () => {
    expect(value('.mtrl-snackbar .mtrl-icon-button.mtrl-snackbar__close', 'color')).toBe('var(--mtrl-sys-color-inverse-on-surface)');
    expect(value('.mtrl-snackbar--dismissible', 'padding-inline-end')).toBe('0');
  });

  test('a long action goes below the text, aligned to the end', () => {
    expect(value('.mtrl-snackbar--action-below', 'flex-wrap')).toBe('wrap');
    expect(value('.mtrl-snackbar--action-below .mtrl-snackbar__text', 'flex-basis')).toBe('100%');
    expect(value('.mtrl-snackbar--action-below .mtrl-snackbar__action', 'margin-inline-start')).toBe('auto');
  });

  test('enters with a fade and a scale on the fast springs; reduced motion keeps the fade', () => {
    expect(value('.mtrl-snackbar', 'scale')).toBe('0.8');
    expect(value('.mtrl-snackbar--visible', 'scale')).toBe('1');
    const transition = value('.mtrl-snackbar', 'transition') ?? '';
    expect(transition).toMatch(/opacity 175ms linear\(/);
    expect(transition).toMatch(/scale 425ms linear\(/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.mtrl-snackbar\s*\{[^}]*scale: none/);
  });

  test('positions are classes with physical sides, and the mirrored side is a direction arm; compact windows keep a fixed 16px from every edge', () => {
    expect(value('.mtrl-snackbar--center', 'translate')).toBe('-50% 0');
    expect(value('.mtrl-snackbar--start', 'left')).toBe('16px');
    expect(value('.mtrl-snackbar--end', 'right')).toBe('16px');
    // A consumer's bundler lowers inset-inline-start/-end into :lang() lists
    // that match a language, never dir="rtl": the bundled sheet pinned both
    // places to the left edge of a right-to-left page. The mirrored side is a
    // direction arm — the marker class on the surface itself, where the
    // runtime writes it, the class on an ancestor, the shadow tree's host
    // class, and a cut attribute fallback.
    for (const member of [
      '.mtrl-snackbar--start:where(.mtrl-rtl, [dir=rtl])',
      ':where(.mtrl-rtl) .mtrl-snackbar--start',
      ':where(:host(.mtrl-rtl)) .mtrl-snackbar--start',
      '[dir=rtl] .mtrl-snackbar--start:not(:where(.mtrl-ltr, .mtrl-ltr *))',
    ]) {
      expect(value(member, 'left')).toBe('auto');
      expect(value(member, 'right')).toBe('16px');
    }
    for (const member of [
      '.mtrl-snackbar--end:where(.mtrl-rtl, [dir=rtl])',
      ':where(.mtrl-rtl) .mtrl-snackbar--end',
      ':where(:host(.mtrl-rtl)) .mtrl-snackbar--end',
      '[dir=rtl] .mtrl-snackbar--end:not(:where(.mtrl-ltr, .mtrl-ltr *))',
    ]) {
      expect(value(member, 'right')).toBe('auto');
      expect(value(member, 'left')).toBe('16px');
    }
    expect(css).toMatch(/max-width: 599px\)\s*\{\s*\.mtrl-snackbar\s*\{[^}]*width: calc\(100% - 32px\)/);
    expect(css).not.toContain('.mtrl-snackbar--primary');
    expect(css).not.toContain('.mtrl-snackbar--multiline');
  });
});

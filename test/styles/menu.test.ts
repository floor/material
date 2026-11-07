// test/styles/menu.test.ts
//
// The menu stylesheet against the M3 tokens (Compose MenuTokens.kt) and the
// baseline measurements on m3.material.io/components/menus/specs.
import { readdirSync } from 'node:fs';
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString, Logger } from 'sass';
import { baseStyles, componentStyles, standaloneThemes, themeStyles } from '../../scripts/style-manifest';
import { corner } from '../utils/corner';

let css = '';

const rules = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(css.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
};

const value = (selector: string, property: string): string | undefined =>
  rules(selector)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

beforeAll(() => {
  css = compileString(`@use 'components/menu';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n/g, ', ');
});

describe('menu stylesheet', () => {
  // In a scrolling menu the divider kept flex-shrink 1 and collapsed
  test('the divider does not shrink in a menu that scrolls', () => {
    expect(value('.mtrl-menu__divider', 'flex-shrink')).toBe('0');
  });

  test('the container is surface-container at level 2 with a 4dp corner and border-box sizing', () => {
    expect(value('.mtrl-menu', 'box-sizing')).toBe('border-box');
    expect(value('.mtrl-menu', 'background-color')).toBe('var(--mtrl-sys-color-surface-container)');
    expect(value('.mtrl-menu', 'border-radius')).toBe(corner(4));
    expect(value('.mtrl-menu', 'box-shadow')).toBe('0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)');
    expect(value('.mtrl-menu', 'min-width')).toBe('112px');
    expect(value('.mtrl-menu', 'max-width')).toBe('280px');
    expect(value('.mtrl-menu', 'padding')).toBe('8px 0');
  });

  test('an item is 48dp tall, label-large, inset 12dp', () => {
    expect(value('.mtrl-menu__item', 'min-height')).toBe('48px');
    expect(value('.mtrl-menu__item', 'padding')).toBe('12px');
    expect(value('.mtrl-menu__item', 'font-size')).toBe('14px');
    expect(value('.mtrl-menu__item', 'color')).toBe('var(--mtrl-sys-color-on-surface)');
  });

  test('leading icons are 24dp in on-surface-variant, 12dp from the label', () => {
    expect(value('.mtrl-menu__item-icon svg', 'width')).toBe('24px');
    expect(value('.mtrl-menu__item-icon svg', 'height')).toBe('24px');
    expect(value('.mtrl-menu__item-icon', 'color')).toBe('var(--mtrl-sys-color-on-surface-variant)');
    expect(value('.mtrl-menu__item-icon', 'margin-inline-end')).toBe('12px');
  });

  test('a selected item takes the secondary-container roles and keeps its check', () => {
    expect(value('.mtrl-menu__item--selected', 'background-color')).toBe('var(--mtrl-sys-color-secondary-container)');
    expect(value('.mtrl-menu__item--selected', 'color')).toBe('var(--mtrl-sys-color-on-secondary-container)');
    // the check is the second cue the accessibility guidance asks for
    expect(rules('.mtrl-menu__item--selected::after').length).toBeGreaterThan(0);
    expect(value('.mtrl-menu__item--selected:hover::before', 'background-color')).toBe('var(--mtrl-sys-color-on-secondary-container)');
  });

  test('the focus layer is for keyboard navigation only', () => {
    // Focus moves into the menu however it was opened, so a plain `:focus`
    // marked the first item the moment the menu appeared under the pointer
    // the active option of a listbox, which keeps focus on its combobox, wears the same layer
    expect(value('.mtrl-menu__item:focus-visible::before, .mtrl-menu__item--active::before', 'opacity')).toBe('0.1');
    expect(value('.mtrl-menu__item:focus::before', 'opacity')).toBeUndefined();
    expect(value('.mtrl-menu__item:focus', 'outline')).toBe('none');
    // the hover and pressed layers are unaffected (the pressed one yields to a ripple)
    expect(value('.mtrl-menu__item:hover::before', 'opacity')).toBe('0.08');
    expect(value('.mtrl-menu__item:active:not(:has(> .mtrl-ripple))::before', 'opacity')).toBe('0.1');
  });

  test('the select\'s keyboard-reached option draws the 3dp inward secondary ring', () => {
    // The active option of a listbox keeps focus on its combobox, so
    // :focus-visible never matches it; the select marks the option a key
    // reached and the sheet draws md.comp.focus-ring there.
    expect(value('.mtrl-menu__item--keyboard-active', 'outline')).toBe('3px solid var(--mtrl-sys-color-secondary)');
    expect(value('.mtrl-menu__item--keyboard-active', 'outline-offset')).toBe('-3px');
  });

  test('keyboard focus draws a 3dp inward secondary focus ring on the item and the surface, with no unconditional outline: none on the menu', () => {
    expect(value('.mtrl-menu__item:focus-visible', 'outline')).toBe('3px solid var(--mtrl-sys-color-secondary)');
    expect(value('.mtrl-menu__item:focus-visible', 'outline-offset')).toBe('-3px');
    expect(value('.mtrl-menu:focus-visible', 'outline')).toBe('3px solid var(--mtrl-sys-color-secondary)');
    expect(value('.mtrl-menu:focus-visible', 'outline-offset')).toBe('-3px');
    expect(value('.mtrl-menu', 'outline')).toBeUndefined();
  });

  test('no compiled stylesheet passes a quoted string as a colour in outline, color, background, border, box-shadow, fill, or stroke', () => {
    const elements = readdirSync('src/styles/elements')
      .map((file) => /^_(.+)\.scss$/.exec(file)?.[1])
      .filter((name): name is string => !!name && !['config', 'index'].includes(name));
    const entries: Array<[string, string]> = [
      ['main', `@use "main";`],
      ['base', baseStyles.map((source, index) => `@use "${source}" as b${index};`).join('\n')],
      ...Object.entries(componentStyles).map(([key, entry]): [string, string] => [`component:${key}`, `@use "${entry.source}";`]),
      ...elements.map((name): [string, string] => [`element:${name}`, `@use "elements/${name}";`]),
      ...themeStyles.map((theme): [string, string] => [`theme:${theme}`, `@use "themes/${theme}";`]),
      ...standaloneThemes.map((theme): [string, string] => [`standalone-theme:${theme}`, `@use "themes/${theme}";`]),
    ];
    const propRe = /(?:^|[;{\n])\s*((?:outline|color|background|border|box-shadow|fill|stroke)[a-z-]*)\s*:\s*([^;{}]+)/gi;
    const hits: string[] = [];
    for (const [name, source] of entries) {
      const sheet = compileString(source, { loadPaths: ['src/styles'], style: 'expanded', logger: Logger.silent }).css;
      for (const match of sheet.matchAll(propRe)) {
        const prop = match[1];
        const raw = match[2].trim();
        const withoutUrls = raw.replace(/url\((?:"[^"]*"|'[^']*'|[^)]*)\)/gi, '');
        if (/["']/.test(withoutUrls)) {
          hits.push(`${name} -> ${prop}: ${raw}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  test('a disabled item is dimmed but still reachable', () => {
    expect(value('.mtrl-menu__item--disabled', 'color')).toBe('color-mix(in srgb, var(--mtrl-sys-color-on-surface) 38%, transparent)');
    // it can be focused and read; it just does nothing, so no pointer block
    expect(value('.mtrl-menu__item--disabled', 'pointer-events')).toBeUndefined();
    expect(value('.mtrl-menu__item--disabled', 'cursor')).toBe('default');
    expect(value('.mtrl-menu__item--disabled:hover::before, .mtrl-menu__item--disabled:active::before', 'opacity')).toBe('0');
  });

  test('the divider is 1dp of outline-variant with 8dp above and below', () => {
    expect(value('.mtrl-menu__divider', 'height')).toBe('1px');
    expect(value('.mtrl-menu__divider', 'margin')).toBe('8px 0');
    expect(value('.mtrl-menu__divider', 'background-color')).toBe('var(--mtrl-sys-color-outline-variant)');
  });

  test('it grows in height, closes the same way in reverse, and reduced motion drops the movement quietly', () => {
    expect(value('.mtrl-menu', 'transform')).toBe('scaleY(0)');
    expect(value('.mtrl-menu--visible', 'transform')).toBe('scaleY(1)');
    // one transition for both directions
    expect(value('.mtrl-menu', 'transition')).toBe('transform 250ms cubic-bezier(0.3, 0, 0, 1), opacity 250ms cubic-bezier(0.3, 0, 0, 1), visibility 250ms');
    expect(value('.mtrl-menu--visible', 'transition')).toBeUndefined();
    // Closed, out of the tab order and the accessibility tree; the transition
    // keeps it visible while it moves
    expect(value('.mtrl-menu', 'visibility')).toBe('hidden');
    expect(value('.mtrl-menu--visible', 'visibility')).toBe('visible');
    expect(css).not.toContain('!important');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[\s\S]{0,300}?transform: none;/);
  });

  describe('the expressive vertical menu', () => {
    test('a 16dp container on surface-container-low, items 2dp apart', () => {
      expect(value('.mtrl-menu--vertical', 'border-radius')).toBe(corner(16));
      // GroupPadding: the vertical menu has no container spacing token, so its
      // inset is the group's. Only the horizontal variant gets 8dp.
      expect(value('.mtrl-menu--vertical', 'padding')).toBe('4px');
      expect(value('.mtrl-menu--vertical', 'background-color')).toBe('var(--mtrl-menu-container)');
      expect(value('.mtrl-menu--vertical', '--mtrl-menu-container')).toBe('var(--mtrl-sys-color-surface-container-low)');
      expect(value('.mtrl-menu--vertical .mtrl-menu__list', 'gap')).toBe('2px');
    });

    test('vibrant swaps the mapping to tertiary', () => {
      expect(value('.mtrl-menu--vertical.mtrl-menu--vibrant', '--mtrl-menu-container')).toBe('var(--mtrl-sys-color-tertiary-container)');
      expect(value('.mtrl-menu--vertical.mtrl-menu--vibrant', '--mtrl-menu-label')).toBe('var(--mtrl-sys-color-on-tertiary-container)');
      expect(value('.mtrl-menu--vertical.mtrl-menu--vibrant', '--mtrl-menu-selected-container')).toBe('var(--mtrl-sys-color-tertiary)');
      expect(value('.mtrl-menu--vertical.mtrl-menu--vibrant', '--mtrl-menu-selected-label')).toBe('var(--mtrl-sys-color-on-tertiary)');
    });

    test('an item is 44dp, body-large, and its shape is its state', () => {
      expect(value('.mtrl-menu--vertical .mtrl-menu__item', 'min-height')).toBe('44px');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item', 'font-size')).toBe('16px');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item', 'padding')).toBe('8px 16px');
      // 4dp at rest, 12dp once it is touched
      expect(value('.mtrl-menu--vertical .mtrl-menu__item', 'border-radius')).toBe(corner(4));
      const active = '.mtrl-menu--vertical .mtrl-menu__item:hover, .mtrl-menu--vertical .mtrl-menu__item:focus-visible, .mtrl-menu--vertical .mtrl-menu__item--active, .mtrl-menu--vertical .mtrl-menu__item:active';
      expect(value(active, 'border-radius')).toBe(corner(12));
      expect(value('.mtrl-menu--vertical .mtrl-menu__item--selected', 'border-radius')).toBe(corner(12));
      // and the ends of the column round outwards
      expect(value('.mtrl-menu--vertical .mtrl-menu__item:first-child', 'border-start-start-radius')).toBe(corner(12));
      expect(value('.mtrl-menu--vertical .mtrl-menu__item:last-child', 'border-end-end-radius')).toBe(corner(12));
    });

    test('a selected item takes the tertiary roles; icons are 20dp', () => {
      expect(value('.mtrl-menu--vertical .mtrl-menu__item--selected', 'background-color')).toBe('var(--mtrl-menu-selected-container)');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item--selected', 'color')).toBe('var(--mtrl-menu-selected-label)');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item-icon svg', 'width')).toBe('20px');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item-supporting', 'font-size')).toBe('14px');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item-shortcut', 'font-size')).toBe('11px');
    });

    test('a gap gives each group its own surface', () => {
      // The divider draws a line across one surface; the gap splits the menu
      // into several, so the page shows through between them
      const gapped = '.mtrl-menu--vertical:has(.mtrl-menu__group)';
      expect(value(gapped, 'background-color')).toBe('transparent');
      expect(value(gapped, 'box-shadow')).toBe('none');
      expect(value(gapped, 'padding')).toBe('0');

      // the group takes over the surface and its elevation
      expect(value(`${gapped} .mtrl-menu__group`, 'background-color')).toBe('var(--mtrl-menu-container)');
      expect(value(`${gapped} .mtrl-menu__group`, 'box-shadow')).toBe('0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)');
    });

    test('a corner facing a gap is 8dp; only the outside of the menu is 16dp', () => {
      // SegmentedMenuTokens: GroupShape is CornerSmall and ContainerShape is
      // CornerLarge, so a cut through the menu is tighter than its outline
      const group = '.mtrl-menu--vertical:has(.mtrl-menu__group) .mtrl-menu__group';
      expect(value(group, 'border-radius')).toBe(corner(8));
      expect(value(`${group}:first-child`, 'border-start-start-radius')).toBe(corner(16));
      expect(value(`${group}:first-child`, 'border-start-end-radius')).toBe(corner(16));
      expect(value(`${group}:last-child`, 'border-end-start-radius')).toBe(corner(16));
      expect(value(`${group}:last-child`, 'border-end-end-radius')).toBe(corner(16));
    });

    test('the separator is 2dp, and a group hugs its items at 4dp', () => {
      // Measured off the vertical menu specimen on m3.material.io at its
      // 2px-per-dp scale: 4dp of padding inside a group and 2dp between two,
      // so items either side of a boundary sit 10dp apart. An 8dp gap between
      // 8dp-padded groups put them 24dp apart, which read as a chasm.
      const gapped = '.mtrl-menu--vertical:has(.mtrl-menu__group)';
      expect(value(`${gapped} .mtrl-menu__group`, 'padding')).toBe('4px');
      expect(value(`${gapped} .mtrl-menu__list`, 'gap')).toBe('2px');
      expect(value(`${gapped} .mtrl-menu__group > ul`, 'gap')).toBe('2px');
    });

    test('a gapped menu does not clip, so the group shadows survive', () => {
      // .mtrl-menu clips to keep item backgrounds inside its rounded corners;
      // with no container of its own, clipping only cut the shadows off square
      const gapped = '.mtrl-menu--vertical:has(.mtrl-menu__group)';
      expect(value(gapped, 'overflow')).toBe('visible');
      expect(value(`${gapped} .mtrl-menu__list`, 'overflow')).toBe('visible');
      // and the plain menu still clips
      expect(value('.mtrl-menu', 'overflow')).toBe('hidden');
    });

    test('the container morphs to show which menu is active', () => {
      expect(value('.mtrl-menu--vertical.mtrl-menu--active', 'border-radius')).toBe('24px');
      expect(value('.mtrl-menu--vertical.mtrl-menu--inactive', 'border-radius')).toBe(corner(8));
    });

    test('a selected item suppresses the trailing check while a submenu item keeps its chevron and 48px end padding', () => {
      expect(value('.mtrl-menu--vertical .mtrl-menu__item--selected:not(.mtrl-menu__item--submenu)::after', 'content')).toBe('none');
      expect(rules('.mtrl-menu__item--submenu::after').length).toBeGreaterThan(0);
      expect(value('.mtrl-menu__item--submenu::after', 'content')).toBe('""');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item--submenu', 'padding-inline-end')).toBe('48px');
    });

    test('forced colours, reduced motion and dense sit after the vertical rules so they win at equal specificity, and item height is static against density', () => {
      const verticalSelectedIdx = css.indexOf('.mtrl-menu--vertical .mtrl-menu__item--selected {');
      const verticalTransitionIdx = css.lastIndexOf('.mtrl-menu--vertical {\n  transition:');
      const verticalItemIdx = css.indexOf('.mtrl-menu--vertical .mtrl-menu__item {');
      const forcedColorsIdx = css.indexOf('@media (forced-colors: active)');
      const reducedMotionIdx = css.indexOf('@media (prefers-reduced-motion: reduce)');
      const denseItemIdx = css.indexOf('.mtrl-menu--dense .mtrl-menu__item {');

      expect(verticalSelectedIdx).toBeGreaterThan(-1);
      expect(forcedColorsIdx).toBeGreaterThan(verticalSelectedIdx);
      expect(css.slice(forcedColorsIdx)).toMatch(
        /\.mtrl-menu\s+\.mtrl-menu__item--selected\s*\{[^}]*background-color:\s*Highlight;[^}]*color:\s*HighlightText;/
      );
      expect(css.slice(forcedColorsIdx)).toMatch(
        /\.mtrl-menu\s+\.mtrl-menu__group\s*\{[^}]*border:\s*1px solid CurrentColor;/
      );

      expect(verticalTransitionIdx).toBeGreaterThan(-1);
      expect(reducedMotionIdx).toBeGreaterThan(verticalTransitionIdx);
      expect(css.slice(reducedMotionIdx)).toMatch(
        /\.mtrl-menu\s+\.mtrl-menu__item\s*\{[^}]*transition:\s*none;/
      );

      expect(verticalItemIdx).toBeGreaterThan(-1);
      expect(denseItemIdx).toBeGreaterThan(verticalItemIdx);
      expect(value('.mtrl-menu--dense .mtrl-menu__item', 'min-height')).toBe('32px');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item', 'min-height')).toBe('44px');
      expect(value('.mtrl-menu--vertical .mtrl-menu__item', 'min-height')).not.toContain('--mtrl-density');
    });
  });

  test('the column ends round outwards on the physical block edge in every artefact', () => {
    // A block-edge pair (the top two corners of the first item, the bottom
    // two of the last): it mirrors to itself, so the lowered artefacts carry
    // the physical pair with no direction arm, while the adopted sheets keep
    // the logical pair that also mirrors to itself
    // (abstract/_direction.scss, scripts/build-styles.ts).
    const arms = compileString(
      `@use 'abstract/emit' as config with ($direction-arms: true);\n@use 'components/menu';`,
      { loadPaths: ['src/styles'], style: 'expanded' },
    ).css.replace(/,\n/g, ', ');
    expect(css).toContain(
      '.mtrl-menu--vertical .mtrl-menu__item:first-child {\n' +
        `  border-start-start-radius: var(--mtrl-sys-shape-corner-medium, 12px);\n` +
        `  border-start-end-radius: var(--mtrl-sys-shape-corner-medium, 12px);\n}`,
    );
    expect(arms).toContain(
      '.mtrl-menu--vertical .mtrl-menu__item:first-child {\n' +
        `  border-top-left-radius: var(--mtrl-sys-shape-corner-medium, 12px);\n` +
        `  border-top-right-radius: var(--mtrl-sys-shape-corner-medium, 12px);\n}`,
    );
    expect(arms).toContain(
      '.mtrl-menu--vertical .mtrl-menu__item:last-child {\n' +
        `  border-bottom-left-radius: var(--mtrl-sys-shape-corner-medium, 12px);\n` +
        `  border-bottom-right-radius: var(--mtrl-sys-shape-corner-medium, 12px);\n}`,
    );
    // No logical corner property is left for a bundler to lower into :lang().
    expect(arms).not.toMatch(/border-(start|end)-(start|end)-radius/);
  });
});

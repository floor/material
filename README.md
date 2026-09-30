# mtrl

Material Design 3 components for the web, written in TypeScript with zero dependencies.

mtrl implements the M3 expressive update: component sizes, shapes, colours and spring motion follow the Material 3 tokens. Each component is a plain function that returns a DOM element and a small API, so mtrl works with any framework or none. The documentation site, [md3.io](https://md3.io), shows every component with live examples.

## Quick start

```bash
npm install mtrl
```

```typescript
import 'mtrl/styles';
import { createButton, createTextfield } from 'mtrl';

const name = createTextfield({ label: 'Name' });
const save = createButton({ text: 'Save', variant: 'filled' });
save.disabled.disable();

name.on('input', ({ value }: { value: string }) => {
  if (value.trim()) save.disabled.enable();
  else save.disabled.disable();
});

save.on('click', () => {
  console.log('Saved', name.getValue());
});

document.body.append(name.element, save.element);

// When the view goes away, release listeners and DOM
name.destroy();
save.destroy();
```

`mtrl/styles` loads every component and theme. For a smaller bundle, import only what you use (see [Styles](#styles)).

## Components

Every component is created by a `create*` function exported from `mtrl`, and renders with `mtrl-` prefixed classes.

- **Actions:** `createButton`, `createButtonGroup`, `createSplitButton`, `createIconButton`, `createFab`, `createExtendedFab`
- **Selection and input:** `createCheckbox`, `createChips` and `createChip`, `createRadios`, `createSwitch`, `createSlider`, `createSelect`, `createTextfield`, `createSearch`, `createDatePicker`, `createTimePicker`
- **Navigation:** `createNavigationRail`, `createDrawer`, `createTabs` and `createTab`, `createTopAppBar`, `createBottomAppBar`, `createMenu`, `createNavigation`, `createNavigationSystem`
- **Containment:** `createCard` with `createCardHeader`, `createCardContent`, `createCardMedia` and `createCardActions`, `createCarousel`, `createList`, `createDivider`, `createDialog`, `createBottomSheet`, `createSideSheet`
- **Communication:** `createSnackbar`, `createTooltip`, `createBadge`, `createProgress`, `createLoadingIndicator`
- **Deprecated:** `createSegmentedButton` and `createSegment`, replaced by `createButtonGroup` with `kind: 'connected'`

Virtual scrolling and data-driven lists live in [mtrl-addons](https://github.com/floor/mtrl-addons).

## Styles

Import the full stylesheet once:

```typescript
import 'mtrl/styles';
```

Or import the base once, followed by the components you use:

```typescript
import 'mtrl/styles/base';
import 'mtrl/styles/button';
import 'mtrl/styles/textfield';

// Optional: an alternate theme and the utility classes
import 'mtrl/themes/ocean';
import 'mtrl/styles/utilities';
```

The base includes the baseline theme in light and dark, the tokens, a reset, typography and the ripple. Each selective entry imports what it depends on (the select brings the text field and the menu), so use a CSS-capable bundler to resolve and deduplicate them. Choose either the full stylesheet or selective imports, not both. The date picker has no selective entry yet; it is in the full stylesheet.

Library styles sit in ordered `mtrl` cascade layers, so unlayered application CSS overrides them without specificity battles.

### Themes

The baseline theme applies by default and follows the system light or dark preference. Choose a theme and mode on the root element:

```html
<html data-theme="ocean" data-theme-mode="dark">
```

```typescript
document.documentElement.dataset.theme = 'ocean';
document.documentElement.dataset.themeMode = 'dark';
```

Available themes: `baseline`, `ocean`, `desert`, `forest`, `sunset`, `spring`, `summer`, `autumn`, `brownbeige`, `sageivory`, `tealcaramel` and `highcontrast`. With selective styles, import the theme's entry, for example `mtrl/themes/ocean`.

M3's scheme variants, generated from the baseline seed, ship as their own entries only (not in the full stylesheet): `neutral`, `vibrant`, `expressive`, `fidelity`, `content`, `monochrome`, `rainbow` and `fruit-salad`, for example `mtrl/themes/vibrant`. `schemeToTokens` (`mtrl/core/theme`) turns any M3 scheme's role colours into these tokens.

Deprecated, removed in 1.0: `material` (use `baseline`), `winter` (use `ocean`), `browngreen` (use `brownbeige`) and `legacy`.

### Custom properties

Components read the theme's colour roles, so overriding a role restyles every component that uses it:

```css
:root {
  --mtrl-sys-color-primary: #6750a4;
  --mtrl-sys-color-on-primary: #ffffff;
}
```

The type scale and shape scale are custom properties too (`--mtrl-sys-typescale-*`, `--mtrl-sys-shape-*`). Component hooks follow one convention, `--mtrl-<component>-<name>`:

```css
.brand-slider {
  --mtrl-slider-color: #006a6a;
  --mtrl-slider-on-color: #ffffff;
}
```

## Imports and tree-shaking

mtrl publishes ESM with type declarations, so bundlers drop unused exports and split dynamic imports. CommonJS remains available through `require('mtrl')`.

| Import | Path |
|--------|------|
| Component creators | `import { createButton } from 'mtrl'` |
| One component directly | `import createSlider from 'mtrl/components/slider'` |
| Component constants | `import { BUTTON_VARIANTS } from 'mtrl/components/button/constants'` |
| Core utilities | `import { addClass, removeClass } from 'mtrl/core/dom'` |

Constants are not exported from the root; import them from the component's `constants` entry:

```typescript
import { createButton } from 'mtrl';
import { BUTTON_VARIANTS, BUTTON_SIZES } from 'mtrl/components/button/constants';

const button = createButton({
  text: 'Submit',
  variant: BUTTON_VARIANTS.FILLED,
  size: BUTTON_SIZES.L,
});
```

Button progress and card actions load on demand; enable code splitting in your build to keep them out of the initial chunk.

## Web components and frameworks (experimental)

From the 0.10.0 prereleases (`npm install mtrl@next`), every component also ships as a custom element, with thin adapters for React, Vue, Svelte and Solid. The API may still change before 1.0.

| Kind | Elements | Framework components (Vue: `M` prefix, e.g. `MDialog`) |
|------|----------|--------------------------------------------------------|
| Actions | `<m-button>`, `<m-icon-button>`, `<m-fab>`, `<m-extended-fab>`, `<m-split-button>`, `<m-button-group>` + `<m-button-group-item>` | `Button`, `IconButton`, `Fab`, `ExtendedFab`, `SplitButton`, `ButtonGroup`, `ButtonGroupItem` |
| Form controls | `<m-checkbox>`, `<m-switch>`, `<m-radios>` + `<m-radio>`, `<m-slider>`, `<m-textfield>`, `<m-select>` + `<m-select-option>`, `<m-search>` + `<m-search-suggestion>`, `<m-datepicker>`, `<m-timepicker>` | `Checkbox`, `Switch`, `Radios`, `Radio`, `Slider`, `Textfield`, `Select`, `SelectOption`, `Search`, `SearchSuggestion`, `Datepicker`, `Timepicker` |
| Selection | `<m-chips>` + `<m-chip>`, `<m-tabs>` + `<m-tab>`, `<m-list>` + `<m-list-item>` | `Chips`, `Chip`, `Tabs`, `Tab`, `List`, `ListItem` |
| Navigation | `<m-navigation-rail>` + `<m-navigation-rail-item>`, `<m-drawer>` + `<m-drawer-item>`, `<m-top-app-bar>`, `<m-bottom-app-bar>` | `NavigationRail`, `NavigationRailItem`, `Drawer`, `DrawerItem`, `TopAppBar`, `BottomAppBar` |
| Overlays (top layer) | `<m-menu>` + `<m-menu-item>`, `<m-dialog>`, `<m-bottom-sheet>`, `<m-side-sheet>`, `<m-tooltip>`, `<m-snackbar>` | `Menu`, `MenuItem`, `Dialog`, `BottomSheet`, `SideSheet`, `Tooltip`, `Snackbar` |
| Containment | `<m-card>`, `<m-carousel>` + `<m-carousel-item>` | `Card`, `Carousel`, `CarouselItem` |
| Indicators | `<m-progress>`, `<m-loading-indicator>`, `<m-badge>`, `<m-divider>` | `Progress`, `LoadingIndicator`, `Badge`, `Divider` |

Overlays open in the browser's top layer (`showModal()` or `popover`) from inside their own shadow root, so they keep their styles, trap focus and make the page inert where M3 says so. Form controls are form-associated: `name`, the form value, reset, validation, `<label for>` and back-navigation restore work as on native controls.

```html
<script type="module">
  import 'mtrl/elements/css';            // the elements' styles
  import { defineAll } from 'mtrl/elements';
  defineAll();                           // registers every element (<m-button>, <m-switch>, …)
</script>

<form>
  <m-textfield name="email" type="email" label="Email" required></m-textfield>
  <m-radios name="plan" value="free" aria-label="Plan">
    <m-radio value="free">Free</m-radio>
    <m-radio value="pro">Pro</m-radio>
  </m-radios>
  <m-switch name="news" checked>Newsletter</m-switch>
  <m-button type="submit">Sign up</m-button>
</form>

<m-tabs value="songs">
  <m-tab value="songs">Songs</m-tab>
  <m-tab value="albums">Albums</m-tab>
</m-tabs>
```

The page still loads mtrl's base styles and a theme (see [Styles](#styles)); the elements render in shadow DOM and pick up the theme's tokens. Attributes are defaults and properties the live state, as on native controls: a `checked` or `value` attribute sets the state until the user or a script changes it, and `form.reset()` goes back to it. Form controls take part in forms (their host's `name`), reset, validation and back-navigation restore.

| Framework | Import | Two-way binding |
|-----------|--------|-----------------|
| React 18 and 19 | `import { Switch } from 'mtrl/react'` | `checked` + `onChange`, or `defaultChecked` |
| Vue 3 | `import { MSwitch } from 'mtrl/vue'` | `v-model` |
| Svelte 5 | `import { Switch } from 'mtrl/svelte'` | `bind:checked` |
| Solid | `import { Switch } from 'mtrl/solid'` | `checked` + `onChange` |

Each framework is an optional peer dependency; mtrl installs none of them. All adapters render on the server and hydrate. Angular apps use the elements directly, with `CUSTOM_ELEMENTS_SCHEMA`.

A server-rendered page sends each element as its tag and light DOM; the element takes its real look once its script defines it. So that nothing moves meanwhile, put the pre-upgrade stylesheet in `<head>`: it gives every element not defined yet the box it will have (and its label the final type style), hides what it declares (`<m-tab>`, `<m-menu-item>`, …) and overlays. Its rules match only `:not(:defined)`, in the `mtrl.preupgrade` cascade layer.

```html
<link rel="stylesheet" href="/node_modules/mtrl/dist/elements/preupgrade.css">
```

With another tag prefix, `preupgradeStyles('x')` from `mtrl/elements/preupgrade` returns the same stylesheet for `<x-*>`, to inline on the server. The CSS modules (`mtrl/elements/css`) also apply these rules until the elements are defined, for the default prefix and the one given to `configure()` or `define()`.

## Building your own components

Components are composed from small features with `pipe`. The same building blocks are public:

```typescript
import { pipe, createBase, withEvents, withElement } from 'mtrl/core/compose';
import type { ElementComponent } from 'mtrl/core/compose';

interface NoteConfig {
  text?: string;
}

interface NoteComponent extends ElementComponent {
  setText: (text: string) => NoteComponent;
}

const createNote = (config: NoteConfig): NoteComponent =>
  pipe(
    createBase,
    withEvents(),
    withElement({ tag: 'div', componentName: 'note' }),
    (component) => ({
      ...component,
      setText(text: string) {
        component.element.textContent = text;
        return this;
      },
    })
  )(config);
```

The element gets the `mtrl-note` class, `withEvents` adds `on`, `off` and `emit`, and `destroy()` removes the element. Add `withLifecycle()` from `mtrl/core/compose/features` when features need to register cleanup.

## Markup and sanitizing

Icons and `content` options are markup strings, written with `innerHTML`. Every such write goes through one sink, so you can decide once how markup is treated. Set a policy when the strings can come from users or a CMS, or when your page enforces Trusted Types:

```typescript
import { configureHTML } from 'mtrl';

// A sanitizer
configureHTML({ sanitize: (html) => DOMPurify.sanitize(html) });

// Trusted Types: under `require-trusted-types-for 'script'` a plain string
// assignment throws, so return a TrustedHTML from a policy your CSP allows
const policy = window.trustedTypes.createPolicy('mtrl', {
  createHTML: (html) => DOMPurify.sanitize(html),
});
configureHTML({ sanitize: (html) => policy.createHTML(html) });
```

The policy sees every string, the library's own icons included; a `TrustedHTML` value passed as an icon or content skips it. With no policy set, markup is written as it is. Text options (`text`, a card's `text`) never go through `innerHTML`.

## Upgrading from 0.7

0.8.0 aligns the components with Material 3 expressive, and some of that changes the API or the styles:

- `createSheet` is removed; use `createBottomSheet` or `createSideSheet`.
- FAB and extended FAB: `variant: 'primary'`, `'secondary'` and `'tertiary'` are now the tone styles; the former look is `'primary-container'` (the default), `'secondary-container'` and `'tertiary-container'`.
- `createSegmentedButton` is deprecated in favour of `createButtonGroup({ kind: 'connected' })`; its heights are now 40, 36 and 32px by density.
- Component custom properties are renamed to `--mtrl-<component>-<name>`, for example `--drawer-width` to `--mtrl-drawer-width` and `--item-offset` to `--mtrl-list-item-offset`.
- `title-large` uses weight 400, as M3 specifies.
- The slider draws with DOM and CSS; styles for `.mtrl-slider-canvas` no longer apply.

The full list, with every renamed property, is in the [0.8.0 changelog](CHANGELOG.md#080---2026-09-15).

## Browser support

Current Chrome, Edge, Firefox and Safari. The spring motion uses CSS `linear()` easing (Safari 17.2 or later); older browsers render every component but skip those transitions.

## Contributing

Contributions are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers the development setup, conventions and the distribution checks; [TESTING.md](TESTING.md) covers the test suite.

## License

MIT, see [LICENSE](LICENSE).

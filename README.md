# material

Material Design 3 components for the web: as web components, as React, Vue, Svelte and Solid components, and as plain JavaScript. Written in TypeScript, with zero dependencies.

```html
<form>
  <m-text-field name="email" type="email" label="Email" required></m-text-field>
  <m-switch name="news" checked>Newsletter</m-switch>
  <m-button type="submit">Sign up</m-button>
</form>
```

Once the elements are registered ([below](#use-it-your-way)), these controls take part in the form as native ones do: its value, reset and validation. Try every component in the playground on **[md3.io](https://md3.io)**, with examples in each framework.

## Why material

- **Material 3 Expressive.** Component sizes, shapes, colours and spring motion follow the Material 3 tokens.
- **One implementation, every stack.** The same component is a custom element, a React, Vue, Svelte or Solid component, and a factory, so it looks and behaves the same in each.
- **Measured sizes.** Every component has a gzip budget that CI enforces on each pull request, and bundlers keep only what you import. The numbers are under [Sizes](#sizes).
- **Zero dependencies.** Installing `material` installs nothing else. React, Vue, Svelte and Solid are optional peers: material uses the one your app has.
- **Server rendering.** Elements and framework components render to declarative shadow DOM on Node and Bun, styled at first paint, and hydrate. See [Server rendering](#server-rendering).
- **Native behaviour.** Form controls are form-associated, and overlays open in the browser's top layer, trap focus and make the page inert where M3 says so.

## Install

<!-- install -->
```bash
npm install material@next
```

3.0.0 is in pre-release, on the `next` tag. Until it is released, `npm install material` without the tag installs 1.0.4, an earlier and separate library (see [Where this came from](#where-this-came-from)).
<!-- /install -->

React, Vue, Svelte and Solid are optional peer dependencies: material uses the one your app has and installs none of them.

## Use it your way

| Way | Import from | Good for |
|-----|-------------|----------|
| Web components | `material/elements` | Plain HTML, server templates, Angular, any framework |
| React | `material/react` | React 18 and 19, Next.js |
| Vue | `material/vue` | Vue 3, Nuxt |
| Svelte | `material/svelte` | Svelte 5, SvelteKit |
| Solid | `material/solid` | SolidJS, SolidStart |
| Vanilla factories | `material` | The smallest bundles and full control |

Every app imports the base stylesheet once: the theme, the tokens a component reads, and the ripple. Type classes and the type scale are `material/styles/typography` (see [Styles](#styles)).

```typescript
import 'material/styles/base';
```

**Web components**: register them once, then write HTML.

<!-- example: run, shows "Sign up" -->
```html
<script type="module">
  import 'material/styles/base';
  import 'material/elements/css';
  import { defineAll } from 'material/elements';
  defineAll();
</script>

<form>
  <m-text-field name="email" type="email" label="Email" required></m-text-field>
  <m-switch name="news" checked>Newsletter</m-switch>
  <m-button type="submit">Sign up</m-button>
</form>
```

The script imports bare specifiers and stylesheets, so the page goes through a bundler such as Vite. Opened straight from disk, the browser cannot resolve them and the form stays unstyled.

**React** (Vue, Svelte and Solid work the same way, see [below](#react-vue-svelte-and-solid)):

<!-- example: run, shows "Sign up" -->
```tsx
import { createRoot } from 'react-dom/client';
import 'material/styles/base';
import { Button, Switch, TextField } from 'material/react';

export function Signup() {
  return (
    <form>
      <TextField name="email" type="email" label="Email" required />
      <Switch name="news" defaultChecked>Newsletter</Switch>
      <Button type="submit">Sign up</Button>
    </form>
  );
}

createRoot(document.getElementById('root')!).render(<Signup />);
```

React and React DOM are yours to install, and the page has a `<div id="root">`. In an app that already renders, leave out the first import and the last line, and use `<Signup />` where you need it.

**Vanilla**: each component is a function that returns a DOM element and a small API.

<!-- example: run, shows "Save" -->
```typescript
import 'material/styles';
import { createButton, createTextField } from 'material';

const name = createTextField({ label: 'Name' });
const save = createButton({ text: 'Save', variant: 'filled' });
save.disabled.disable();

name.on('input', ({ value }: { value: string }) => {
  if (value.trim()) save.disabled.enable();
  else save.disabled.disable();
});
save.on('click', () => console.log('Saved', name.getValue()));

document.body.append(name.element, save.element);
```

When the view goes away, release the listeners and the DOM:

<!-- example: continues -->
```typescript
name.destroy();
save.destroy();
```

The factories are the fastest way to render hundreds of components at once, such as a long editable table; the elements style a shadow root each. `material/styles` loads every component's styles; for a smaller bundle, import only what you use (see [Styles](#styles)).

Events, methods and cleanup are in the [Vanilla guide](https://md3.io/docs/vanilla/).

## Components

Every component comes three ways:

- a factory, `createButton`;
- an element, `<m-button>`;
- a framework component, `Button` (`MButton` in Vue).

| Group | Components |
|-------|------------|
| Actions | Button, Icon button, Button group, Split button, FAB, Extended FAB, FAB menu, Toolbar |
| Selection and input | Checkbox, Switch, Radio buttons, Chips, Slider, Text field, Select, Search, Date picker, Time picker |
| Navigation | Navigation bar, Navigation rail, Drawer, Tabs, Menu, Top app bar, Bottom app bar |
| Containment | Card, Carousel, List, Divider, Dialog, Bottom sheet, Side sheet |
| Communication | Badge, Progress, Loading indicator, Snackbar, Tooltip |

Each component has a page on [md3.io](https://md3.io/components/) with a playground, its options, events and methods. The factories, all exported from `material`:

| Group | Factories |
|-------|-----------|
| Actions | `createButton`, `createIconButton`, `createButtonGroup`, `createSplitButton`, `createFab`, `createExtendedFab`, `createFabMenu`, `createToolbar` |
| Selection and input | `createCheckbox`, `createSwitch`, `createRadios`, `createChips`, `createSlider`, `createTextField`, `createSelect`, `createSearch`, `createDatePicker`, `createTimePicker` |
| Chips, one at a time | `createAssistChip`, `createFilterChip`, `createInputChip`, `createSuggestionChip` |
| Navigation | `createNavigationBar`, `createNavigationRail`, `createDrawer`, `createTabs`, `createTab`, `createMenu`, `createTopAppBar`, `createBottomAppBar` |
| Containment | `createCard`, `createCarousel`, `createList`, `createDivider`, `createDialog`, `createBottomSheet`, `createSideSheet` |
| Card parts | `createCardHeader`, `createCardContent`, `createCardMedia`, `createCardActions` |
| Communication | `createBadge`, `createProgress`, `createLoadingIndicator`, `createSnackbar`, `createTooltip` |

## Styles

The elements and the framework components carry their own styles in their shadow roots. They need only the base stylesheet, for the theme and its tokens. The factories render in the page, so they use the page's stylesheets. Import the full stylesheet once:

```typescript
import 'material/styles';
```

Or import the base once, followed by the components you use:

```typescript
import 'material/styles/base';
import 'material/styles/button';
import 'material/styles/text-field';

// Optional: an alternate theme and the utility classes
import 'material/themes/ocean';
import 'material/styles/utilities';
```

Choose one or the other, not both. Each selective entry imports what it depends on (the select brings the text field and the menu), so a CSS-capable bundler resolves and deduplicates them. These entries import CSS, so they do not load in plain Node.

What each stylesheet holds:

| Import | Holds |
|--------|-------|
| `material/styles/base` | The baseline theme in light and dark, the colour, shape and typeface tokens, a reset and the ripple |
| `material/styles/typography` | The type scale, the type classes (`.mtrl-display-large` to `.mtrl-label-small`), the text utilities, and the styles for headings and paragraphs |
| `material/styles/<component>` | One component, with what it depends on |
| `material/styles` | Every component, the typography, and the twelve themes with their contrast levels |

Import the typography stylesheet when the page uses the type classes, relies on material's heading styles, or reads a `--mtrl-sys-typescale-*` token in its own CSS. It has to load after the base; the import takes care of that.

Library styles sit in ordered `mtrl.*` cascade layers, so unlayered application CSS overrides them without specificity battles.

The Sass sources ship for reference; configuring them with `@use … with` is not a supported API in `material` 3.0.0. Theme with CSS custom properties.

The [Theming guide](https://md3.io/docs/theming/) has the detail: load order, each token, and how to build a theme from a seed colour.

### Themes

The baseline theme applies by default and follows the system light or dark preference. Choose a theme and mode on the root element:

```html
<html data-theme="ocean" data-theme-mode="dark">
```

```typescript
document.documentElement.dataset.theme = 'ocean';
document.documentElement.dataset.themeMode = 'dark';
```

| Themes | Names | Where |
|--------|-------|-------|
| Baseline and the eleven others | `baseline`, `ocean`, `desert`, `forest`, `sunset`, `spring`, `summer`, `autumn`, `brownbeige`, `sageivory`, `tealcaramel`, `highcontrast` | In the full stylesheet, and each as `material/themes/<name>` |
| M3's scheme variants | `neutral`, `vibrant`, `expressive`, `fidelity`, `content`, `monochrome`, `rainbow`, `fruit-salad` | As `material/themes/<name>` only |

Every theme has three contrast levels. Set one with `data-theme-contrast` on the element that carries the theme:

```html
<html data-theme="desert" data-theme-mode="dark" data-theme-contrast="high">
```

```typescript
import 'material/styles/base';
import 'material/styles/contrast';
import 'material/themes/desert';
import 'material/themes/desert-contrast';
```

The attribute is opt-in: the full stylesheet includes it, and selective styles add the two contrast imports above. Without the attribute, the system's `prefers-contrast: more` selects high contrast, with no import.

How contrast resolves on nested themes, and how each level is derived, is in the [Theming guide](https://md3.io/docs/theming/#contrast).

### Custom properties

Components read the theme's colour roles, so overriding a role restyles every component that uses it:

```css
:root {
  --mtrl-sys-color-primary: #6750a4;
  --mtrl-sys-color-on-primary: #ffffff;
}
```

The typefaces and the corner scale are custom properties too, so setting one on `:root` restyles every component that uses it. Component hooks follow one convention, `--mtrl-<component>-<name>`:

```css
.brand-slider {
  --mtrl-slider-color: #006a6a;
  --mtrl-slider-on-color: #ffffff;
}
```

The [Theming guide](https://md3.io/docs/theming/#the-other-tokens) lists the type, shape and state tokens.

## Web components

Overlays open in the browser's top layer from inside their own shadow root, so they keep their styles, trap focus and make the page inert where M3 says so.

Form controls are form-associated. As on native controls, these work:

- `name` and the form value;
- reset and validation;
- `<label for>`;
- back-navigation restore.

Declaration children describe a component's items, as native `<select>` and `<option>` do:

```html
<m-tabs value="songs">
  <m-tab value="songs">Songs</m-tab>
  <m-tab value="albums">Albums</m-tab>
</m-tabs>
```

Attributes are defaults and properties the live state, as on native controls. A `checked` attribute sets the state until the user or a script changes it, and `form.reset()` goes back to it.

The page still loads material's base styles and a theme (see [Styles](#styles)); the elements pick up the theme's tokens.

A server-rendered page sends each element as its tag and light DOM, and the element takes its real look once its script defines it. To reserve its box until then, put the pre-upgrade stylesheet in `<head>`, after the base styles and theme:

```html
<link rel="stylesheet" href="/node_modules/material/dist/elements/preupgrade.css">
```

With a bundler, import `material/elements/preupgrade.css`. What the stylesheet does, its per-element files and its limits are in the [Server rendering guide](https://md3.io/docs/server-rendering/#avoiding-layout-shift); attributes, events, slots and forms are in the [Web Components guide](https://md3.io/docs/web-components/).

## React, Vue, Svelte and Solid

The framework components render the elements, so everything above holds: forms, the top layer, the styling. Each entry loads the elements' CSS and registers each element the first time it mounts.

| Framework | Import | Two-way binding | Guide |
|-----------|--------|-----------------|-------|
| React 18 and 19 | `import { Switch } from 'material/react'` | `checked` + `onChange`, or `defaultChecked` | [React](https://md3.io/docs/react/) |
| Vue 3 | `import { MSwitch } from 'material/vue'` | `v-model` | [Vue](https://md3.io/docs/vue/) |
| Svelte 5 | `import { Switch } from 'material/svelte'` | `bind:checked` | [Svelte](https://md3.io/docs/svelte/) |
| Solid | `import { Switch } from 'material/solid'` | `checked` + `onChange` | [Solid](https://md3.io/docs/solid/) |

Good to know:

- Each framework is an optional peer dependency; material installs none of them.
- All four render on the server and hydrate.
- Angular apps use the elements directly, with `CUSTOM_ELEMENTS_SCHEMA`.
- The Svelte entry imports `.svelte` files, so it needs a bundler and does not load in plain Node.
- With `skipLibCheck: false`, use `@types/react` 18.2.71 or later.

A component owns the `on…` props of its element's events and its `default…` props, typed with the element's own payloads. Any other HTML attribute passes to the host.

Each guide covers props and events, controlled and uncontrolled state, named slots, refs and server rendering.

## Server rendering

`renderElement` from `material/ssr` renders an element to declarative shadow DOM, so the first paint is the component. Each framework has a bridge that makes its components emit the same roots; import it in the server bootstrap:

| Framework | Bridge |
|-----------|--------|
| React | `material/ssr/react` |
| Vue | `material/ssr/vue` |
| Svelte | `material/ssr/svelte` |
| Solid | `material/ssr/solid` |

Each root carries its styles one of two ways:

- **Inline, the default.** The root's whole CSS is in a `<style>`: styled at first paint in every engine, with no extra request. The HTML is large before compression, so serve it with brotli.
- **Link mode.** The root has `<link>` tags in place of the style text: small HTML, and stylesheets fetched once and cached. WebKit paints the roots unstyled until they arrive.

Node and Bun are supported. Worker and edge runtimes are unsupported in `material` 3.0.0: there `renderElement` throws "material/ssr is server-only".

The same HTML policy as [Markup and sanitizing](#markup-and-sanitizing) applies to the server entry and the four bridges.

The [Server rendering guide](https://md3.io/docs/server-rendering/) has the rest: measured page sizes for each mode, the limits of the React and Svelte bridges (`Suspense`, context), and how a server-rendered host meets the pre-upgrade stylesheet.

## Events and overlays

Two rules hold for every factory:

- **A config `on*` option is the listener registered at creation.** It gets the same argument as a listener passed to `on()`, and runs before one added later.
- **When `open()` or `close()` returns, the state has changed and the event has been emitted.** Opening an open component, or closing a closed one, does nothing and emits nothing.

The full contract is on [md3.io](https://md3.io/docs/events-and-overlays/): cancellable events, Escape and stacked modals, the elements' `open` attribute, the tooltip's exception, and each component's state getter.

## Imports and tree-shaking

material publishes ESM only, with type declarations, so bundlers drop unused exports and split dynamic imports. From CommonJS, load it with a dynamic `import('material')`.

| Import | Path |
|--------|------|
| Component creators | `import { createButton } from 'material'` |
| One component directly | `import createSlider from 'material/components/slider'` |
| Component constants | `import { BUTTON_VARIANTS } from 'material/components/button/constants'` |
| Core utilities | `import { addClass, removeClass } from 'material/core/dom'` |

Constants are not exported from the root; import them from the component's `constants` entry:

<!-- example: run, shows "Submit" -->
```typescript
import 'material/styles';
import { createButton } from 'material';
import { BUTTON_VARIANTS, BUTTON_SIZES } from 'material/components/button/constants';

const button = createButton({
  text: 'Submit',
  variant: BUTTON_VARIANTS.FILLED,
  size: BUTTON_SIZES.L,
});

document.body.append(button.element);
```

Some parts load on demand: a button's progress indicator, a card's action buttons, a menu's submenus and the FAB menu's desktop menu. Enable code splitting in your build to keep them out of the initial chunk.

## Building your own components

Components are composed from small features with `pipe`. The same building blocks are public:

<!-- example: run, shows "Saved" -->
```typescript
import { pipe, createBase, withEvents, withElement } from 'material/core/compose';

const createNote = (config: { text?: string } = {}) =>
  pipe(
    createBase,
    withEvents(),
    withElement({ tag: 'div', componentName: 'note' }),
    (component) => ({
      ...component,
      setText(text: string) {
        component.element.textContent = text;
      },
    })
  )(config);

// The component's type is what the pipe builds
type NoteComponent = ReturnType<typeof createNote>;

const note: NoteComponent = createNote();
note.setText('Saved');
document.body.append(note.element);
```

What the pipe built:

- the element has the `mtrl-note` class;
- `withEvents` adds the three event methods, `on()` among them;
- `destroy()` removes the element.

Add `withLifecycle()` when features need to register cleanup; it comes from `material/core/compose/features`. The [Architecture guide](https://md3.io/docs/architecture/) explains the building blocks.

## Markup and sanitizing

Icons and `content` options are markup strings, written with `innerHTML`. Every such write goes through one sink, so you can decide once how markup is treated. Set a policy when the strings can come from users or a CMS, or when your page enforces Trusted Types:

```typescript
import DOMPurify from 'dompurify';
import { configureHTML } from 'material';

// A sanitizer (DOMPurify here; any function from markup to markup)
configureHTML({ sanitize: (html) => DOMPurify.sanitize(html) });

// Trusted Types: under `require-trusted-types-for 'script'` a plain string
// assignment throws, so return a TrustedHTML from a policy your CSP allows
const policy = window.trustedTypes.createPolicy('app', {
  createHTML: (html) => DOMPurify.sanitize(html),
});
configureHTML({ sanitize: (html) => policy.createHTML(html) });
```

The policy sees every string, the library's own icons included; a `TrustedHTML` value passed as an icon or content skips it. With no policy set, markup is written as it is. Text options, such as a button's `text`, never go through `innerHTML`.

These attributes are markup. With no policy set they are written as HTML, in the browser and when the server entry or one of the four bridges renders the element. An avatar attribute is not a person's name or an image URL.

<!-- markup-attributes -->

On the element:

- `icon` on `<m-button>`
- `icon` on `<m-extended-fab>`
- `icon` on `<m-fab>`
- `icon` on `<m-icon-button>`
- `selected-icon` on `<m-icon-button>` — while `toggle` and `selected`
- `expand-icon` on `<m-navigation-rail>` — while the rail is collapsed
- `collapse-icon` on `<m-navigation-rail>` — while the rail is expanded
- `leading-icon` on `<m-search>`
- `trailing-icon` on `<m-search>`
- `avatar` on `<m-search>` — not a person's name or an image URL
- `icon` on `<m-slider>`
- `inset-icon` on `<m-slider>` — size M, L or XL, not a range or centred slider, when the track can hold it
- `inset-icon-at-min` on `<m-slider>` — the same, while the value is at the minimum
- `icon` on `<m-split-button>`
- `icon` on `<m-switch>`
- `leading-icon` on `<m-text-field>`
- `trailing-icon` on `<m-text-field>`

On a declaration child:

- `icon` on `<m-button-group-item>`
- `selected-icon` on `<m-button-group-item>` — an icon-only item, while selected
- `icon` on `<m-chip>`
- `trailing-icon` on `<m-chip>`
- `avatar` on `<m-chip>` — input chips only, and it takes precedence over `icon`; not a person's name or an image URL
- `icon` on `<m-drawer-item>`
- `leading-icon` on `<m-list-item>`
- `leading-avatar` on `<m-list-item>` — not a person's name or an image URL
- `trailing-icon` on `<m-list-item>`
- `icon` on `<m-menu-item>`
- `icon` on `<m-navigation-bar-item>`
- `selected-icon` on `<m-navigation-bar-item>` — while that destination is active
- `icon` on `<m-navigation-rail-item>`
- `selected-icon` on `<m-navigation-rail-item>` — while that destination is active
- `icon` on `<m-search-suggestion>`
- `icon` on `<m-select-option>` — written into the menu
- `icon` on `<m-tab>`

The `icon` of the FAB menu and of its items is markup too. The menu opts out of server rendering, so the server leaves those attributes escaped, and the same policy applies when the component upgrades.

<!-- /markup-attributes -->

## Sizes

What a bundler keeps, minified and gzipped (kB is 1,000 bytes), measured from the packed package by `bun run size:check`. The table is refreshed at each release, and CI keeps every figure within 2% of the current build:

<!-- sizes -->
| Import | gzip |
|--------|-----:|
| `createButton` from `material`, with code splitting: the initial chunks (the progress indicator loads on demand) | 7.4 kB |
| `createButton`, without code splitting (the progress indicator included) | 13.7 kB |
| `createButton`, `createTextField` and `createCheckbox`, without code splitting | 19.8 kB |
| Everything the root exports (`export * from 'material'`), without code splitting | 126.9 kB |
| `material/styles/base` | 2.9 kB |
| `material/styles/base` and `material/styles/button` | 5.2 kB |
| `material/styles`, the full stylesheet | 61.9 kB |
<!-- /sizes -->

`bun run size` measures the initial JavaScript of each of the 37 components and fails when one goes over its budget; CI runs both on every pull request. Each component's page on [md3.io](https://md3.io/components/) gives its size.

## Browser support

Current Chrome, Edge, Firefox and Safari. The spring motion uses CSS `linear()` easing (Safari 17.2 or later); older browsers render every component but skip those transitions. The elements use form-associated custom elements and the top layer (`popover` and `<dialog>`), both available in every current browser.

## Upgrading

`material` 3.0.0 removes what `mtrl` 0.10 deprecated. Upgrade to the latest `mtrl` 0.10.x first: it has the 3.0.0 names beside the old ones and flags in your editor each name, option and constant 3.0.0 removes. Then change the package name to `material` and follow the migration guide. Each step is in the changelog:

- `mtrl` 0.10: [Migrating from 0.10.x](https://github.com/floor/material/blob/main/CHANGELOG.md#migrating-from-010x), the 3.0.0 guide.
- `mtrl` 0.9: [Migrating from 0.9.x](https://github.com/floor/material/blob/main/CHANGELOG.md#migrating-from-09x).
- `mtrl` 0.7: [the 0.8.0 changes](https://github.com/floor/material/blob/main/CHANGELOG.md#080---2026-09-15).

## Where this came from

The package was published as `mtrl` up to 0.10.x. The history before 3.0.0 was developed in
`floor/mtrl`; `#numbers` in commit subjects before 3.0.0 refer to
[pull requests there](https://github.com/floor/mtrl/pulls?q=is%3Apr+is%3Aclosed).

Versions of `material` up to 1.0.4 are an earlier, separate library (GPL-3). Its code is on the
`v1` branch of this repository, and it stays installable with `npm install material@legacy`.

What a page meets keeps the name:

- the `mtrl-` class prefix;
- the `--mtrl-` custom properties;
- the `m-` tags;
- the `mtrl.*` cascade layers.

## Contributing

Contributions are welcome. [CONTRIBUTING.md](.github/CONTRIBUTING.md) covers the development setup, conventions and the distribution checks.

## License

MIT, see [LICENSE](LICENSE).

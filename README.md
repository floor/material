# material

Material Design 3 components for the web: as web components, as React, Vue, Svelte and Solid components, and as plain JavaScript. Written in TypeScript, with zero dependencies.

**Documentation, live playgrounds and examples: [md3.io](https://md3.io)**

[![npm version](https://img.shields.io/npm/v/material.svg)](https://www.npmjs.com/package/material)
[![CI](https://github.com/floor/material/actions/workflows/ci.yml/badge.svg)](https://github.com/floor/material/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/material.svg?cacheSeconds=86400)](https://github.com/floor/material/blob/main/LICENSE)

```html
<form>
  <m-text-field name="email" type="email" label="Email" required></m-text-field>
  <m-switch name="news" checked>Newsletter</m-switch>
  <m-button type="submit">Sign up</m-button>
</form>
```

Once the elements are registered ([below](#use-it-your-way)), these controls take part in the form as native ones do: its value, reset and validation.

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
npm install material
```
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

For hundreds of components created at once, such as a long editable table, use the factories: the elements style a shadow root each, which costs more on the first render. The [Web Components guide](https://md3.io/docs/web-components/#many-instances) has the measurement.

`material/styles` loads every component's styles; for a smaller bundle, import only what you use (see [Styles](#styles)).

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

### Factory control labels

Checkbox, Switch, TextField and Slider factories accept `controlLabelOnly: true`
to put `ariaLabel` only on the real input or slider handle. The option defaults
to false; omitted/false output is unchanged.

Opting in omits the generated wrapper's `aria-label`, changing its serialized
HTML and wrapper `[aria-label]` selectors. The control keeps its name, focus
and form behavior. Authored custom-element host labels remain unchanged, so
duplicate host names remain a known limitation.

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
| `material/styles/base-elements` | The same theme, tokens, reset and system contrast response as the base, without global ripple rules; for element applications |
| `material/styles/base-lite` | The baseline theme in light and dark, the colour, shape and typeface tokens, the body theme and the reduced-motion switch; no reset, ripple or contrast modes |
| `material/styles/typography` | The type scale, the type classes (`.mtrl-display-large` to `.mtrl-label-small`), the text utilities, and the styles for headings and paragraphs |
| `material/styles/<component>` | One component, with what it depends on |
| `material/styles` | Every component, the typography, and the twelve themes with their contrast levels |

Import the typography stylesheet when the page uses the type classes, relies on material's heading styles, or reads a `--mtrl-sys-typescale-*` token in its own CSS. It has to load after the base; the import takes care of that.

Element applications can use `material/styles/base-elements` to keep the base's reset and system contrast response while omitting the global ripple rules. Each element's shadow root carries its own ripple CSS. Add `material/styles/contrast` for explicit baseline contrast attributes, just as with the full base.

`material/styles/base-lite` is a smaller option for element pages that also omit the page reset and contrast modes: it keeps the theme, tokens, body theme and global reduced-motion switch. Factory components and page-level `data-ripple` utilities need `material/styles/base`. Choose one base entry for the page.

Library styles sit in ordered `mtrl.*` cascade layers, so unlayered application CSS overrides them without specificity battles.

Components can opt into the existing type-scale role properties through an application Sass build. Prebuilt CSS keeps the default profile. Load configuration first, then compile the factory stylesheet:

```scss
@use "material/src/styles/config" with ($typescale-tokens: true);
@use "material/src/styles/main";
```

The flag defaults to `false`; omitted and false keep the current CSS. Configure it before any dependent Sass module. The shared entry also forwards contrast, direction, tag-prefix and design-token map options. Subsequent entries inherit that configuration without another configuration clause.

For custom elements, compile matching pre-upgrade CSS separately. This entry includes the pre-upgrade layer and the linked-SSR rollback:

```scss
@use "material/src/styles/config" with ($typescale-tokens: true, $tag-prefix: "x");
@use "material/src/styles/preupgrade";
```

App-compiled shadow CSS uses the experimental element authoring API. Compile one file for each key in the element definition's styles, plus the shared shadow styles. This Sass entry emits the configured key; each file must be registered under that key:

```scss
@use "material/src/styles/config" with ($typescale-tokens: true);
@use "material/src/styles/element-styles" with ($name: "button");
```

For a button, compile the ripple, progress and button keys into the three files below. Load and register every file before defining the element:

```typescript
import 'material/styles/base-elements';
import { defineButton, registerStyles } from 'material/elements';

const names = ['ripple', 'progress', 'button'];
const sheets = await Promise.all(names.map(async name => {
  const response = await fetch(`/app-css/${name}.css`);
  if (!response.ok) throw new Error(`Cannot load ${name} styles`);
  return [name, await response.text()];
}));
registerStyles(Object.fromEntries(sheets));
defineButton();
```

The application owns these compiled files and their loading. Include every style key its elements require. Choose the profile before creation; later registration does not replace sheets already adopted by roots. The normal framework adapter entries keep their default CSS imports and do not provide this opt-in profile.

Set only the role properties the application wants to customize:

```css
.application {
  --mtrl-sys-typescale-label-large-font-size: 18px;
  --mtrl-sys-typescale-label-large-font-weight: 600;
}
```

Role properties inherit through element hosts into shadow roots. Each consumed property keeps its current value as fallback; role fonts fall back through the existing brand/plain typeface property and then the compiled family. No complete token sheet is required.

Badge text consumes its existing size, line-height and weight properties; hidden text and dots keep zero font size. Button-group pre-upgrade items use the same size role as their upgraded buttons; the large-size declarations keep their existing priority.

A provided role value wins over the fallback. An inherited role font resolved on an ancestor keeps that ancestor's value; set the role font on the intended scope when changing its reference face. A missing token can use a fallback, but a supplied value of the wrong CSS type follows normal CSS invalid-value behavior.

For linked SSR, point the renderer's cssBase option at the app-compiled shadow CSS directory. Supply the component dependencies and the unchanged host sheets from the distributed element CSS directory. The client uses the same app build. Default inline SSR retains its default CSS.

From 3.1.0, Sass consumers can choose which contrast rules to compile with `$contrast-emit`. Configure the public themes entry in your application stylesheet:

```scss
@use "material/src/styles/themes" with ($contrast-emit: none);
```

Compile with Dart Sass and add your dependencies directory to its load paths, for example:

```sh
sass --load-path=node_modules app.scss app.css
```

For the full stylesheet, use this entry instead:

```scss
@use "material/src/styles/main" with ($contrast-emit: none);
```

| Value | Rules emitted alongside the standard light and dark roles |
|-------|----------------------------------------------------------|
| `all` (default) | Explicit medium/high contrast attributes and the system contrast preference |
| `explicit` | Explicit medium/high contrast attributes only |
| `preference` | The system contrast preference only |
| `none` | Standard roles only; no contrast attributes or preference rules |

Configure the entry before loading any other material theme modules. The setting applies to every theme loaded in that Sass compilation, including standalone themes loaded afterward. This option controls the Sass sources; prebuilt CSS imports keep their existing behavior. Theme with CSS custom properties.

Spring durations and easings can be inherited custom properties. Prebuilt stylesheets keep the literal values. Set `$spring-tokens` on the public config gateway before any component sheet. That gateway forwards the shared flag on `abstract/emit`. Then emit the defaults where the application wants them:

```scss
@use "material/src/styles/config" with ($spring-tokens: true);
@use "material/src/styles/motion" as motion;
@use "material/src/styles/components/switch";

:root {
  @include motion.spring-tokens;
}
```

`motion.spring-tokens` emits thirteen `--mtrl-sys-motion-spring-*` properties from the library motion map. They include `--mtrl-sys-motion-spring-fast-spatial-clamped-easing`.

Component CSS reads those properties and keeps today's literal as the fallback. `$spring-tokens: false`, or leaving it unset, leaves that CSS unchanged. Loading `motion` by itself emits no CSS.

[Motion physics](https://m3.material.io/styles/motion/overview/how-it-works) separates spatial motion from effects; these names follow that split, and the numbers stay the library's.

JavaScript deadlines do not follow an override: the navigation rail removes its switching state after 450ms, the slider removes its settling state after 450ms, and a snackbar leaves on its opacity transition or after 425ms.

The FAB menu's list visibility delay does follow the fast-spatial duration when the flag is on. Custom elements use the same compiled sheets through the existing `registerStyles` call before they are defined. The default element stylesheet does not include the opt-in.

Material describes [three contrast levels](https://m3.material.io/styles/color/system/how-the-system-works) to accommodate different vision needs. Its [color contrast guidance](https://m3.material.io/foundations/designing/color-contrast) explains the role of contrast in readability. Choosing `none` keeps standard colors but removes responses to both explicit contrast choices and the system preference.

The [Theming guide](https://md3.io/docs/theming/) has the detail: load order, each token, and how to build a theme from a seed colour.

The elements' pre-upgrade rules are a third Sass entry. Until its script defines it, an element is its server-rendered light DOM; these rules give the undefined host the box it will have once the shadow root arrives, scoped to `:not(:defined)`. Configure the tag prefix when the elements use another one:

```scss
@use "material/src/styles/elements" with ($tag-prefix: "x");
```

The prefix defaults to `m`. The build emits the same rules, at the default prefix, as `material/elements/preupgrade.css`.

When an application compiles several Sass entries, configure the shared gateway first:

```scss
@use "material/src/styles/config" with (
  $contrast-emit: preference,
  $tag-prefix: "app",
  $direction-arms: true
);
@use "material/src/styles/themes/ocean";
@use "material/src/styles/main";
@use "material/src/styles/elements";
```

The gateway emits zero CSS. Its five supported switches are:

| Switch | Default | Effect |
|--------|---------|--------|
| `$contrast-emit` | `all` | Chooses the contrast families above |
| `$tag-prefix` | `"m"` | Sets the undefined custom-element tag prefix |
| `$direction-arms` | `false` | Compiles physical direction arms for a bundler's CSS pipeline when truthy |
| `$typescale-tokens` | `false` | Enables role-token typography with the existing literal fallbacks |
| `$spring-tokens` | `false` | Enables inherited spring duration/easing references with the existing literal fallbacks |

Both token switches are also configurable directly on the full stylesheet or elements entry. Spring emission and typography are described above; include the motion mixin explicitly to emit the default spring declarations. Token maps are not a supported configuration surface; use CSS custom properties for token values.

Sass [configures a module on its first load](https://sass-lang.com/documentation/at-rules/use/#configuration). Put the gateway before every other material import, including selective sheets. Then load the other entries without `with (...)`. Configuring both the gateway and another entry with `with (...)`, or loading a component before configuring the gateway, produces Sass's standard “already loaded” error. The direct contrast and tag-prefix examples above continue to work when used on their own.

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
| M3's scheme variants | `neutral`, `vibrant`, `expressive`, `fidelity`, `content`, `monochrome`, `rainbow`, `fruit-salad` | As `material/themes/<name>`, and as the Sass source `src/styles/themes/_<name>.scss` |

The scheme variants are not forwarded by the Sass `themes` entry. They ship as Sass sources, and a theme builder reads them by path, as md3.io does:

```scss
@use "material/src/styles/themes/expressive";
```

Each variant is one file in `src/styles/themes`, `_<name>.scss` for the name of its row above.

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

#### Theme origins

Every built-in theme's standard palette has a record of where it came from, as data — not a recipe to regenerate a palette, not an active-theme detector:

```typescript
import { BASELINE_SEED, THEME_ORIGINS, type BuiltInThemeName } from 'material/core/theme';

const origin = THEME_ORIGINS['desert' as BuiltInThemeName];
// { kind: 'generated', seed: '#9a7a3e', variant: 'tonal-spot', contrast: 0, secondary: '#4a87c4' }
```

A generated theme carries its seed, variant and the generator's nominal contrast input (`highcontrast` is `1`; a user's contrast preference does not change the record). The baseline's record describes its documented seed association — its palette is maintained as published tokens.

An authored theme carries its documented source seed where its source records one, and `null` where it does not: `autumn` has no recorded seed, and none is invented. Its variant and contrast are `null` too, no recipe being verified for it. The map and its records are frozen, and a bundler removes the whole block from consumers that never read it.

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

Density is a custom property as well: `--mtrl-density` steps from 0 to -5 on a container. The classes from `.mtrl-density--1` to `.mtrl-density--5` set the same steps by name:

```css
.toolbar {
  --mtrl-density: -2;
}
```

Typography, icons and touch targets keep their size; each component stops at its own height floor, and fixed-height surfaces such as menus and dialogs do not take part. The [Theming guide](https://md3.io/docs/theming/#density) lists the floors.

The [Theming guide](https://md3.io/docs/theming/#the-other-tokens) lists the type, shape and state tokens.

### Token catalogue

`material/tokens/catalogue.json` is a versioned record of every custom property the stylesheets emit: its family in Material's taxonomy, and a verification state with the reason for it. The data is generated while the package is packed, so the copy you install describes the exact build it came with — and importing it is the only way it costs a byte, because nothing in the runtime reads it.

Verification states are honest rather than flattering. A row is `verified` only when a retained Material source was read for its value, the emitted CSS matches that read in every emission context, and CI browser assertions probe the built stylesheets.

Rows without a same-day source read say `unverified` with why, library-internal properties say `not-applicable`, and what the library does not emit at all is listed as gaps rather than fudged into either state. The reason sentences gather into one legend at the root, so a row carries its reason as a stable code:

```json
{
  "cssName": "--mtrl-sys-shape-corner-large",
  "m3Id": null,
  "family": "system",
  "group": "shape",
  "verification": "verified",
  "reason": "shape-step-dp",
  "source": "m3-shape-scale"
}
```

`material/tokens/catalogue.schema.json` ships beside the data, so tooling can validate a document before consuming it. Every document also records what it was built from — the digests of the reviewed input files and of the emitted CSS, and the implementation commit — which is what makes two catalogues with equal content but different provenance distinguishable.

The full wiring behind each row — every emission context, consumer attribution and assertion citation — is generated beside the build as a review artifact, and ships nowhere.

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

| Element | Attribute | Values |
| --- | --- | --- |
| `<m-button>` | `icon-position` | `start` (default), `end` — where the `icon` attribute's icon sits |
| `<m-button>` | `toggle` | boolean: a toggle button, dispatching `change` with `{ selected, value }` |
| `<m-button>` | `selected` | boolean: the default state, while the `selected` property is the live one |
| `<m-card>` | `actions-align` | `start`, `center`, `end` (default), `space-between` |

A card can act as the primary control (`clickable`) or contain child buttons and links. [Material recommends choosing one pattern](https://m3.material.io/components/cards/accessibility). Leave `clickable` off for a card with child actions.

Opt in with `promoteChildActions` or `promote-child-actions` when that clickable card should keep its child actions. The card becomes an article, Tab reaches those children, and the development warning stays off.

Without that opt-in, adding actions through the card APIs or named custom-element action slots warns in development when the card is clickable and keeps the configured role, tab stop and activation behavior. Production bundles strip this diagnostic when `process.env.NODE_ENV` is replaced with `"production"`.

`actions-align` aligns the card's slotted actions, using the factory's `actionsConfig.align` values. Start and end follow text direction. Changes after upgrade update the row; removing the attribute restores `end`. Framework adapters expose `actionsAlign`.

For pre-upgrade reservation, group multiple controls in one `slot="actions"` container. Separate actions-slot siblings form a row after upgrade.

| Element / factory | Attribute / option | Values |
| --- | --- | --- |
| `<m-fab>` / `createFab` | `placement` | `none` (default), `top-start`, `top-end`, `bottom-start`, `bottom-end` |
| `<m-extended-fab>` / `createExtendedFab` | `placement` | Same as FAB |
| `<m-fab-menu>` / `createFabMenu` | `placement` | `none` (default), `bottom-start`, `bottom-end` |

Placement uses logical sides: `end` is right in LTR and left in RTL, and follows direction changes. FAB and extended FAB corners are fixed to the viewport with 16px margins; the FAB menu retains its placement within its positioned container.

`none` keeps the component in the flow. Changes to the element attribute after upgrade recreate the component with the new placement. The framework adapters expose `placement` with the same name.

For FAB and extended FAB, `position` remains a deprecated physical alias until 4.0. Its `top-right` and `top-left` values keep the same physical sides in RTL. So do `bottom-right` and `bottom-left`.

`placement` wins when both are supplied, including `placement="none"`.

To migrate `position="bottom-right"`, use `placement="bottom-end"` for the trailing side in LTR and RTL. Keep the physical alias temporarily if the right side is intentional. See [Migrating](MIGRATING.md).

The page still loads material's base styles and a theme (see [Styles](#styles)); the elements pick up the theme's tokens.

A server-rendered page sends each element as its tag and light DOM, and the element takes its real look once its script defines it. To reserve its box until then, put the pre-upgrade stylesheet in `<head>`, after the base styles and theme:

```html
<link rel="stylesheet" href="/node_modules/material/dist/elements/preupgrade.css">
```

With a bundler, import `material/elements/preupgrade.css`. What the stylesheet does, its per-element files and its limits are in the [Server rendering guide](https://md3.io/docs/server-rendering/#avoiding-layout-shift); attributes, events, slots and forms are in the [Web Components guide](https://md3.io/docs/web-components/).

The API for writing elements of your own is experimental and may change in a minor release. The elements material defines, and their attributes, properties and events, are not.

| Status | Names, all from `material/elements` |
|--------|-------------------------------------|
| Experimental: outside semantic versioning in 3.x | `defineElement`, `ElementSpec`, `registerStyles`, `hasStyles`, `SHADOW_BASE_STYLES` |

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

A standalone menu can also defer its implementation with the explicit
`material/components/menu/deferred` entry. This is an opt-in delivery choice;
`createMenu` and the existing element and framework entries keep their synchronous
behavior. Enable code splitting and keep factory styles loaded normally:

```ts
import createDeferredMenu from 'material/components/menu/deferred';
import 'material/styles/base';
import 'material/styles/menu';

const menu = createDeferredMenu({
  opener: '#actions',
  items: [{ id: 'save', text: 'Save' }],
  on: { loaderror: ({ error }) => console.error(error) },
});
menu.open();             // synchronous requested state and one open event
await menu.preload();    // joins the request; does not open or focus by itself
const surface = menu.element; // real HTMLElement after readiness, otherwise null
```

The handle mirrors the menu's non-DOM operations: queued setters, event
subscriptions, toggling, and access to opener and selection state. Fluent methods
and event payloads identify the same handle.

It is not a synchronous `MenuComponent`. The `element` property is nullable.
Readiness is reported by `isReady()`, while `preload()` returns a Promise.

The requested state from `isOpen()` precedes the cold popup. During that interval,
`aria-expanded` stays false and the opener is busy. Closing cancels presentation
without pretending to abort a module fetch. Destroying is terminal and rejects
outstanding and future preload calls with `AbortError`.

A failed import or construction closes the request, emits `loaderror` and rejects
`preload()`. Explicit subsequent requests may retry; a browser-cached module
failure can require a page reload. There is no automatic retry or cache busting.
Register an error handler before opening and handle the Promise when awaiting
preload. Existing eager menus remain appropriate when DOM access or initially
open content must be usable immediately.

For elements, `material/elements/menu` is the existing menu's dedicated
registration boundary. It exports `defineMenu` plus the menu and item declaration
definitions. Importing it registers nothing.

Delay both that entry and `material/elements/css/menu`. Call `defineMenu` after
both resolve. Import `material/elements/preupgrade/menu.css` with the page's
normal base/theme styles.

The [checked application recipe](scripts/fixtures/menu-deferred/broker.js) keeps
one registration Promise, records cold input once, cancels stale intent and
handles failures. It calls `toggle(originalEvent)` after registration and never
redispatches the gesture. The [element fixture](scripts/fixtures/menu-deferred/element.js)
shows authored items and early host listeners.

Element methods do not exist before upgrade: application callers must await
registration. Custom prefixes register their item declarations first. Supply
matching pre-upgrade CSS with `preupgradeStyles(prefix)` from
`material/elements/preupgrade`.

Closed SSR content can defer client registration while keeping its declarative
shadow root and styles. Initially open attributes/properties use eager
registration and ready styles; no initial-byte saving is claimed for that path.
SSR rendering and framework adapters remain synchronous. Factory ARIA references
are not copied across the element's shadow boundary.

Deferral shifts initial JavaScript and, for the element recipe, shadow CSS to
later requests. It adds a facade or application broker, so fully loaded cost can
increase. Keeping another eager menu import can remove the saving. The packed
`menu-deferred:check` compares initial and fully loaded JS/CSS, including shared
chunks and the recipe, in the same styled 16-component fixtures.

### The date picker's deferred entry

A date picker can bring its calendar on demand too. Import the factory from the component's `deferred` entry instead of the root:

```typescript
import { createDeferredDatePicker } from 'material/components/datepicker/deferred';
```

It is the same picker and the same API: the field, the trigger and the open and close state are there when the factory returns. The calendar is imported on the first open, or on the pointer or focus on the trigger that precedes it.

Until it arrives the dialog has no calendar and no focus into it, and `aria-expanded` stays `false`. The dialog is named by `aria-label` because the title its name points at does not exist yet.

Opening and closing are never held behind the load. The open state answers at once, and so does a close while the calendar is in flight; the calendar mounts when its chunk lands and stays closed. Read the open state rather than the dialog's markup while an open is in flight.

### Bundling

The build ships two direction forms. The full stylesheet and the per-component sheets — `material/styles` and `material/styles/<component>` — write physical sides with mirrored arms. The properties an old-target bundler rewrites, the `inset-inline-*` longhands and the logical corner radii, are absent from them, so no bundler pass can put them on the wrong side. Logical margins remain, and an old-target bundler can still rewrite those.

The arms answer `dir="rtl"` and the `mtrl-rtl` class on the component itself, on an ancestor, or on a shadow host; a nested `mtrl-ltr` island stays left to right. What stays logical, such as `margin-inline-start`, mirrors when `dir` is set. The marker class does not set the direction. The element sheets and the shadow sheets keep the logical form throughout.

A bundler can still add direction rules of its own when it bundles the logical form. Bun's bundler does when its browser targets predate logical properties: Lightning CSS rewrites each logical declaration into physical ones, guarded by a `:lang()` list of the right-to-left languages.

Those arms are an approximation: they key on the document's language, not its direction, so a page whose `dir` and language disagree gets the wrong side. Do not strip them: where language and direction agree, they are what mirrors the layout.

Language alone does not flip the shipped stylesheets. Set `dir`, or the marker. An Arabic page with neither stays left to right for the placements these sheets arm.

No shipped file carries a `:lang()` rule. The only `:dir()` rules are the two badge rules on the tabs element sheet.

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

Add `withLifecycle()` from `material/core/compose` when features need to register cleanup. The [Architecture guide](https://md3.io/docs/architecture/) explains the building blocks.

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
- `selected-icon` on `<m-drawer-item>` — while that destination is active
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
| `createButton` from `material`, with code splitting: the initial chunks (the progress indicator loads on demand) | 7.6 kB |
| `createButton`, without code splitting (the progress indicator included) | 13.9 kB |
| `createButton`, `createTextField` and `createCheckbox`, without code splitting | 20.4 kB |
| Everything the root exports (`export * from 'material'`), without code splitting | 130.8 kB |
| `material/styles/base` | 3.1 kB |
| `material/styles/base-lite` | 1.7 kB |
| `material/styles/base` and `material/styles/button` | 5.4 kB |
| `material/styles`, the full stylesheet | 59.6 kB |
<!-- /sizes -->

`bun run size` measures the initial JavaScript of each of the 37 components and fails when one goes over its budget; CI runs both on every pull request. Each component's page on [md3.io](https://md3.io/components/) gives its size. The measured table — minified, gzipped and deferred, per component against the core kernel — is in [SIZES.md](SIZES.md).

## Browser support

Current Chrome, Edge, Firefox and Safari. The JavaScript targets ES2022, parsed in CI with acorn 8: a parser that stops before ES2022 cannot load the package. The spring motion uses CSS `linear()` easing (Safari 17.2 or later); older browsers render every component but skip those transitions. The elements use form-associated custom elements and the top layer (`popover` and `<dialog>`), both available in every current browser.

## Upgrading

Upgrade to the latest `mtrl` 0.10.x first, then change the package name to `material`. The [migration guide](MIGRATING.md), verified against 3.0.5, starts with silent theme fallbacks and lists renamed and removed APIs, with their replacements.

Earlier upgrades have their own notes: [from 0.9.x](https://github.com/floor/material/blob/main/CHANGELOG.md#migrating-from-09x) and [the 0.8.0 changes](https://github.com/floor/material/blob/main/CHANGELOG.md#080---2026-09-15).

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

Third-party notices: the package ships Material Symbols and Material Icons glyphs, copyright Google LLC, under the Apache License 2.0; [NOTICE](NOTICE) includes the licence text and lists the files that declare them.

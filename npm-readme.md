# material

Material Design 3 components for the web: as web components, as React, Vue, Svelte and Solid components, and as plain JavaScript. Written in TypeScript, with zero dependencies.

**Documentation, live playgrounds and examples: [md3.io](https://md3.io)**

[![npm version](https://img.shields.io/npm/v/material.svg)](https://www.npmjs.com/package/material)
[![CI](https://github.com/floor/material/actions/workflows/ci.yml/badge.svg)](https://github.com/floor/material/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/material.svg?cacheSeconds=86400)](https://github.com/floor/material/blob/main/LICENSE)

- **Material 3 Expressive.** Component sizes, shapes, colours and spring motion follow the Material 3 tokens.
- **One implementation, every stack.** A button looks and behaves the same as an element, as a framework component and as a factory.
- **Zero dependencies.** Installing `material` installs nothing else; the frameworks are optional peers.
- **Server rendering.** Elements and framework components render to declarative shadow DOM on Node and Bun.
- **Measured sizes.** A size budget per component, enforced on every pull request.

## Install

<!-- install -->
```bash
npm install material
```
<!-- /install -->

## Quick start

<!-- example: run, shows "Save" -->
```typescript
import 'material/styles';
import { createButton, createTextField } from 'material';

const name = createTextField({ label: 'Name' });
const save = createButton({ text: 'Save', variant: 'filled' });

save.on('click', () => console.log('Saved', name.getValue()));

document.body.append(name.element, save.element);
```

`material/styles` is a stylesheet, so this needs a bundler that handles CSS imports (Vite, webpack, Bun, …). Each factory returns a DOM element and a small API; call `destroy()` when the view goes away.

For a factory page whose buttons stay filled, small and round, use the optional fixed-profile sheet:

```typescript
import 'material/styles/base';
import 'material/styles/button-filled-small-round';
import createButton from 'material/components/button';

const save = createButton({ text: 'Save', variant: 'filled', size: 's', shape: 'round' });
document.body.append(save.element);
```

Progress styles are included. Hover, keyboard focus, press, disabled, selected toggle and loading states, icons, density, RTL and CSS custom-property overrides remain available. This styles factory buttons in the page; elements and framework components keep their shadow styles.

Import `material/styles/button` for any other variant, size or shape. This includes changes through the variant, size and shape setters. The general sheet wins in either import order. Components such as tabs can bring that sheet already, in which case adding the fixed sheet costs more CSS.

## Components

| Group | Components |
|-------|------------|
| Actions | Button, Icon button, Button group, Split button, FAB, Extended FAB, FAB menu, Toolbar |
| Selection and input | Checkbox, Switch, Radio buttons, Chips, Slider, Text field, Select, Search, Date picker, Time picker |
| Navigation | Navigation bar, Navigation rail, Drawer, Tabs, Menu, Top app bar, Bottom app bar |
| Containment | Card, Carousel, List, Divider, Dialog, Bottom sheet, Side sheet |
| Communication | Badge, Progress, Loading indicator, Snackbar, Tooltip |

Every component comes three ways: a factory, a custom element and a framework component. Each has a page with a playground on [md3.io/components](https://md3.io/components/).

## Bottom app bar compatibility entry

The experimental `material/components/bottom-app-bar-toolbar` factory keeps the legacy bottom app bar API with docked-toolbar styling. Import its stylesheet explicitly, including on pages using the full stylesheet:

```typescript
import createBottomAppBarToolbar from 'material/components/bottom-app-bar-toolbar';
import 'material/styles/base';
import 'material/styles/bottom-app-bar-toolbar';

const save = document.createElement('button');
save.type = 'button';
save.textContent = 'Save';
const bar = createBottomAppBarToolbar({ autoHide: true });
bar.addAction(save);
document.body.append(bar.element);
```

Use it when a factory screen needs legacy chaining, native Tab order, live action containers, a centred or late-added FAB, or custom transition duration. It is absent from the root export and has no element, framework adapter or SSR registration.

For new screens, use the docked toolbar from `material/components/toolbar`. The legacy `createBottomAppBar` is deprecated in 3.x but remains available with its existing behaviour. See the [migration note](https://github.com/floor/material/blob/main/MIGRATING.md#bottom-app-bar-in-3x).

The [implementation measurements](https://github.com/floor/material#measured-entry-cost) record 4,386 B gzip for the compatibility JavaScript graph versus 4,248 B for the legacy graph. A standalone styled Vite page needs 11,157 B initially versus 7,358 B, with no deferred bytes; caller-owned controls, fonts, external icons and HTML are outside those costs.

That snapshot added 1,655 B compressed, 7,158 B unpacked and five package files. Root and existing default payloads were byte-identical; the entry provides no root or default-bundle saving.

## Web components

A page imports the base stylesheet and the elements' CSS once, then registers the elements with `defineAll()`. After that `<m-button>` and the rest are HTML, in plain pages, server templates and any framework.

Form controls are form-associated: the form value, reset and validation work as on native controls. Overlays open in the browser's top layer. Guide: [md3.io/docs/web-components](https://md3.io/docs/web-components/).

## React, Vue, Svelte and Solid

| Framework | Import | Guide |
|-----------|--------|-------|
| React 18 and 19 | `import { Switch } from 'material/react'` | [md3.io/docs/react](https://md3.io/docs/react/) |
| Vue 3 | `import { MSwitch } from 'material/vue'` | [md3.io/docs/vue](https://md3.io/docs/vue/) |
| Svelte 5 | `import { Switch } from 'material/svelte'` | [md3.io/docs/svelte](https://md3.io/docs/svelte/) |
| Solid | `import { Switch } from 'material/solid'` | [md3.io/docs/solid](https://md3.io/docs/solid/) |

The framework components render the elements, load their CSS and register each one the first time it mounts. An app imports `material/styles/base` once for the theme. Each framework is an optional peer dependency: `material` uses the one your app has.

## Server rendering

`renderElement` from `material/ssr` renders an element to declarative shadow DOM. Each framework has a bridge, such as `material/ssr/react`, that makes its components emit the same roots and hydrate.

Node and Bun use the server entries. Under the `workerd` and `worker` export conditions, the SSR entry and its four bridges select those same server entries ahead of browser; enabling `worker` selects server code even for a client worker. Browser-only builds keep the safe-to-import stub, whose retained `renderElement` call throws "material/ssr is server-only".

Wrangler selects `workerd`. For Vite webworker SSR, set `ssr.target: "webworker"` and `ssr.noExternal: ["material"]`; also set `ssr.resolve.conditions: ["workerd", "worker", "browser"]` so default webworker browser conditions do not select the stub. CI checks the packed package and four framework renders in pinned workerd without Node compatibility. Guide: [md3.io/docs/server-rendering](https://md3.io/docs/server-rendering/).

## Themes

The baseline theme applies by default and follows the system light or dark preference. Eleven more are in the full stylesheet, each in light and dark, with three contrast levels:

```html
<html data-theme="ocean" data-theme-mode="dark">
```

Colours, typefaces and shapes are CSS custom properties (`--mtrl-sys-color-primary`, …), so one declaration restyles every component that reads it. Density is one property too: `--mtrl-density` steps from 0 to -5. A class from `.mtrl-density--1` to `.mtrl-density--5` sets a step as well. Guide: [md3.io/docs/theming](https://md3.io/docs/theming/); the themes side by side: [md3.io/styles/themes](https://md3.io/styles/themes/).

Each built-in theme's origin is data on `material/core/theme`: `THEME_ORIGINS` records the generated themes' seed, variant and nominal contrast input (including two-colour secondaries), the baseline's documented seed, and each authored palette's documented source seed — `null` where none is recorded, with no invented recipe. The map is frozen, and a bundler drops it when unused.

## Sizes

What a bundler keeps, minified and gzipped (kB is 1,000 bytes), measured from the packed package. The table is refreshed at each release, and CI keeps every figure within 2% of the current build:

<!-- sizes -->
| Import | gzip |
|--------|-----:|
| `createButton` from `material`, with code splitting: the initial chunks (the progress indicator loads on demand) | 7.6 kB |
| `createButton`, without code splitting (the progress indicator included) | 13.9 kB |
| `createButton`, `createTextField` and `createCheckbox`, without code splitting | 20.4 kB |
| Everything the root exports (`export * from 'material'`), without code splitting | 131.1 kB |
| `material/styles/base` | 3.1 kB |
| `material/styles/base-lite` | 1.7 kB |
| `material/styles/base` and `material/styles/button` | 5.4 kB |
| `material/styles`, the full stylesheet | 59.6 kB |
<!-- /sizes -->

`material` publishes ESM only, so bundlers drop what you do not import. Each component's page on [md3.io/components](https://md3.io/components/) gives its size.

## Browser support

Current Chrome, Edge, Firefox and Safari. The JavaScript targets ES2022, parsed in CI with acorn 8: a parser that stops before ES2022 cannot load the package. The spring motion uses CSS `linear()` easing (Safari 17.2 or later); older browsers render every component but skip those transitions.

## Upgrading

Upgrade to the latest `mtrl` 0.10.x first, then change the package name to `material` and follow the [migration guide](https://github.com/floor/material/blob/main/MIGRATING.md), verified against 3.0.5. It starts with silent theme fallbacks and lists renamed and removed APIs, with their replacements.

## Where this came from

The package was published as `mtrl` up to 0.10.x, and its history before 3.0.0 was developed in `floor/mtrl`. The class prefix (`mtrl-`), the custom properties, the `m-` tags and the cascade layers keep their names.

Versions of `material` up to 1.0.4 are an earlier, separate library (GPL-3), still installable with `npm install material@legacy`.

## Links

[Documentation](https://md3.io) · [Repository and full README](https://github.com/floor/material#readme) · [Changelog](https://github.com/floor/material/blob/main/CHANGELOG.md) · [Issues](https://github.com/floor/material/issues)

## License

MIT, see [LICENSE](https://github.com/floor/material/blob/main/LICENSE).

Third-party notices: the package ships Material Symbols and Material Icons glyphs, copyright Google LLC, under the Apache License 2.0; [NOTICE](https://github.com/floor/material/blob/main/NOTICE) includes the licence text and lists the files that declare them.

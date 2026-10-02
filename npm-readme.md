# material

Material Design 3 components for the web: as web components, as React, Vue, Svelte and Solid components, and as plain JavaScript. Written in TypeScript, with zero dependencies.

- **Material 3 Expressive.** Component sizes, shapes, colours and spring motion follow the Material 3 tokens.
- **One implementation, every stack.** A button looks and behaves the same as an element, as a framework component and as a factory.
- **Zero dependencies.** Installing `material` installs nothing else; the frameworks are optional peers.
- **Server rendering.** Elements and framework components render to declarative shadow DOM on Node and Bun.
- **Measured sizes.** A size budget per component, enforced on every pull request.

Documentation, a live playground and examples in every framework: **[md3.io](https://md3.io)**.

## Install

<!-- install -->
```bash
npm install material@next
```

3.0.0 is in pre-release, on the `next` tag. Until it is released, `npm install material` without the tag installs 1.0.4, an earlier and separate library (see [Where this came from](#where-this-came-from)).
<!-- /install -->

## Quick start

<!-- example: run -->
```typescript
import 'material/styles';
import { createButton, createTextField } from 'material';

const name = createTextField({ label: 'Name' });
const save = createButton({ text: 'Save', variant: 'filled' });

save.on('click', () => console.log('Saved', name.getValue()));

document.body.append(name.element, save.element);
```

`material/styles` is a stylesheet, so this needs a bundler that handles CSS imports (Vite, webpack, Bun, …). Each factory returns a DOM element and a small API; call `destroy()` when the view goes away.

## Components

| Group | Components |
|-------|------------|
| Actions | Button, Icon button, Button group, Split button, FAB, Extended FAB, FAB menu, Toolbar |
| Selection and input | Checkbox, Switch, Radio buttons, Chips, Slider, Text field, Select, Search, Date picker, Time picker |
| Navigation | Navigation bar, Navigation rail, Drawer, Tabs, Menu, Top app bar, Bottom app bar |
| Containment | Card, Carousel, List, Divider, Dialog, Bottom sheet, Side sheet |
| Communication | Badge, Progress, Loading indicator, Snackbar, Tooltip |

Every component comes three ways: a factory (`createButton`), an element (`<m-button>`) and a framework component (`Button`; `MButton` in Vue). Each has a page with a playground on [md3.io/components](https://md3.io/components/).

## Web components

A page imports `material/styles/base` and `material/elements/css` once, and `defineAll()` from `material/elements` registers `<m-button>`, `<m-text-field>` and the rest, for plain HTML, server templates and any framework. The elements render in shadow DOM and read the page's theme. Form controls are form-associated: `name`, the form value, reset and validation work as on native controls. Overlays open in the browser's top layer. Guide: [md3.io/docs/web-components](https://md3.io/docs/web-components/).

## React, Vue, Svelte and Solid

| Framework | Import | Guide |
|-----------|--------|-------|
| React 18 and 19 | `import { Switch } from 'material/react'` | [md3.io/docs/react](https://md3.io/docs/react/) |
| Vue 3 | `import { MSwitch } from 'material/vue'` | [md3.io/docs/vue](https://md3.io/docs/vue/) |
| Svelte 5 | `import { Switch } from 'material/svelte'` | [md3.io/docs/svelte](https://md3.io/docs/svelte/) |
| Solid | `import { Switch } from 'material/solid'` | [md3.io/docs/solid](https://md3.io/docs/solid/) |

The framework components render the elements, load their CSS and register each one the first time it mounts. An app imports `material/styles/base` once for the theme. Each framework is an optional peer dependency: `material` uses the one your app has.

## Server rendering

`renderElement` from `material/ssr` renders an element to declarative shadow DOM. Import `material/ssr/react`, `material/ssr/vue`, `material/ssr/svelte` or `material/ssr/solid` in the server bootstrap and that framework's components emit the same roots, then hydrate. Node and Bun are supported; worker and edge runtimes are not in `material` 3.0.0. Guide: [md3.io/docs/server-rendering](https://md3.io/docs/server-rendering/).

## Themes

The baseline theme applies by default and follows the system light or dark preference. Eleven more are in the full stylesheet, each in light and dark, with three contrast levels:

```html
<html data-theme="ocean" data-theme-mode="dark">
```

Colours, typefaces and shapes are CSS custom properties (`--mtrl-sys-color-primary`, …), so one declaration restyles every component that reads it. Guide: [md3.io/docs/theming](https://md3.io/docs/theming/); the themes side by side: [md3.io/styles/themes](https://md3.io/styles/themes/).

## Sizes

What a bundler keeps, minified and gzipped (kB is 1,000 bytes), measured from the packed package:

<!-- sizes -->
| Import | gzip |
|--------|-----:|
| `createButton` from `material`, initial chunks (its progress indicator loads on demand) | 7.4 kB |
| `createButton`, in one file | 13.7 kB |
| `createButton`, `createTextField` and `createCheckbox`, in one file | 19.8 kB |
| Everything the root exports (`export * from 'material'`), in one file | 126.9 kB |
| `material/styles/base` | 2.9 kB |
| `material/styles/base` and `material/styles/button` | 5.2 kB |
| `material/styles`, the full stylesheet | 62.2 kB |
<!-- /sizes -->

`material` publishes ESM only, so bundlers drop what you do not import. Each component's page on [md3.io/components](https://md3.io/components/) gives its size.

## Browser support

Current Chrome, Edge, Firefox and Safari. The spring motion uses CSS `linear()` easing (Safari 17.2 or later); older browsers render every component but skip those transitions.

## Upgrading

Upgrade to the latest `mtrl` 0.10.x first, then change the package name to `material` and follow the [migration guide](https://github.com/floor/material/blob/main/CHANGELOG.md#migrating-from-010x).

## Where this came from

The package was published as `mtrl` up to 0.10.x, and its history before 3.0.0 was developed in `floor/mtrl`. The `mtrl-` class prefix, the `--mtrl-` custom properties, the `m-` tags and the `mtrl.*` cascade layers keep their names.

Versions of `material` up to 1.0.4 are an earlier, separate library (GPL-3), still installable with `npm install material@legacy`.

## Links

[Documentation](https://md3.io) · [Repository and full README](https://github.com/floor/material#readme) · [Changelog](https://github.com/floor/material/blob/main/CHANGELOG.md) · [Issues](https://github.com/floor/material/issues)

## License

MIT, see [LICENSE](https://github.com/floor/material/blob/main/LICENSE).

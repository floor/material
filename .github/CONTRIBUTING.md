# Contributing to mtrl

Thank you for your interest in contributing to mtrl! This document provides guidelines and instructions for contributing to this lightweight, TypeScript-focused UI component library.

## Why Contribute?

mtrl aims to be a modern, flexible UI component library with:

- Zero dependencies (except Bun for development)
- TypeScript-first codebase
- Lightweight, tree-shakable components
- Simple and extensible API
- Excellent documentation

By contributing to mtrl, you'll help create a lean alternative to heavier frameworks while gaining experience with modern TypeScript patterns and component design.

## Getting Started

### Development Environment

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/mtrl.git
   cd mtrl
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

### Testing Your Components with md3.io

mtrl's documentation site, [md3.io](https://md3.io), is a separate repository ([floor/md3.io](https://github.com/floor/md3.io)) with a playground for every component. To see your changes there, clone it beside your mtrl checkout; it depends on `file:../mtrl`:

```bash
# Next to the mtrl repository
git clone https://github.com/floor/md3.io.git
cd md3.io
bun install

# Serves http://localhost:4300 and rebuilds mtrl, then the site, when material/src changes
bun run dev
```

## Contribution Workflow

1. **Pick an issue or feature** - Start with issues labeled `good-first-issue` or `help-wanted`.

2. **Create a branch** - Name your branch based on what you're working on:
   ```bash
   git checkout -b feature/button-improvements
   # or
   git checkout -b fix/text-field-validation
   ```

3. **Make your changes** - Follow the coding standards and guidelines below.

4. **Test your changes** - Tests go in the same commit as the code (see [Testing](#testing)), and md3.io shows the component live (see above).

5. **Submit a pull request** - Include a detailed description of your changes and reference any related issues.

## Development Guidelines

### Component Structure

A component is a factory composed from small features with `pipe`: each `with*` function adds one capability to the component object and returns it.

```typescript
// src/components/divider/divider.ts
import { createBase, withElement, pipe, withVariant } from "../../core/compose";
import { DividerConfig, createBaseConfig } from "./config";
import { withOrientation, withInset, withStyle } from "./features";
import { DividerComponent } from "./types";

export const createDivider = (config: DividerConfig = {}): DividerComponent => {
  const processedConfig = createBaseConfig(config);

  return pipe(
    createBase,
    withElement({ tag: "hr", componentName: "divider", className: config.class }),
    withOrientation(processedConfig),
    withVariant(processedConfig),
    withInset(processedConfig),
    withStyle(processedConfig)
  )(processedConfig) as DividerComponent;
};
```

Read an existing component of the same kind before starting (`src/components/divider` is the smallest). A component touches these places:

- `src/components/<name>/`: `index.ts`, `<name>.ts`, `config.ts`, `types.ts`, `constants.ts`, and `features/` when it has several; exported from `src/components/index.ts`.
- `src/styles/components/_<name>.scss`, imported in `src/styles/main.scss` and declared in `scripts/style-manifest.ts` (the selective stylesheets). Colours, type, shape and motion come from the tokens (`t.color()`, `m.typography()`, `v.shape()`, `v.motion()`), never literals.
- `src/elements/<name>.ts`: the custom element's spec (attributes, properties, events, slots). The React, Vue, Svelte and Solid adapters are generated from it with `bun run adapters:generate`; CI fails when they are stale.
- `scripts/size.ts`: the component's size budget; `scripts/check-token-render.ts`: a case for `bun run tokens:check`.
- `CHANGELOG.md`: an entry under `[Unreleased]`.
- md3.io: a docs page and a playground (see below).

### Using md3.io for Development

md3.io is the best place to develop and test your components (see "Testing Your Components with md3.io" above to run it):

1. Its playgrounds are configured in `src/shared/components.ts` of the md3.io repository.
2. Component documentation lives in its `docs/components/`, and `bun run docs:check` checks every example against your mtrl checkout.
3. `bun run dev` rebuilds mtrl and the site whenever `material/src` changes.

This separation of the library code (mtrl) and the documentation site (md3.io) keeps the main library clean while providing a rich development environment.

### TypeScript Standards

- Use TypeScript's type system to create clear interfaces and types
- Export types and interfaces separately from implementations
- Use strict typing and avoid `any` when possible
- Prefer interfaces for public APIs and type aliases for complex types
- Add proper return types to all functions

### Coding Standards

- Add file path as a comment on the first line of each file
- Use functional programming principles when possible
- Use consistent naming conventions:
  - Factory functions should be named `createXyz`
  - Utilities should use clear, descriptive names
  - Interfaces should be named in PascalCase (e.g., `ButtonOptions`)
- Write TypeDoc comments for all public functions and types

### CSS/SCSS Guidelines

- Use BEM-style naming: `mtrl-component__element--modifier`
- Keep specificity low; each component's rules sit in its own `mtrl.<name>` cascade layer
- Read the design tokens (`--mtrl-sys-*`) rather than literal values, so themes restyle every component
- Component hooks are custom properties named `--mtrl-<component>-<name>`
- Respect `prefers-reduced-motion` and forced colours (`m.reduced-motion`, `m.high-contrast`)

## Distribution checks

After building, check the packed distribution before a release:

```bash
bun run build
bun run size:check
```

The size check packs and installs the local distribution in a temporary directory, checks Node ESM and TypeScript imports (and that `require('material')` does not resolve: the package is ESM-only), and measures minified consumer bundles with gzip and Brotli. It enforces budgets for individual imports, a form, CSS, and the initial button chunks. Results are saved to `analysis/package-size.json`. It does not rebuild `dist`.

For a second bundler and real-browser checks:

```bash
node node_modules/playwright/cli.js install chromium
bun run consumer:check
```

This builds a packed Vite application and checks tree-shaking, CSS deduplication, and on-demand progress loading. Chromium compares the full and selective stylesheets with screenshots and computed styles across component states, the baseline and ocean themes, light and dark modes, and desktop and mobile widths, and exercises pointer and keyboard interactions. Reports and screenshots are saved to `analysis/browser`; CI runs these checks and uploads the artifacts. The comparisons use the full stylesheet from the same build as their reference, so they test distribution equivalence rather than a separate design baseline.

`scripts/style-manifest.ts` declares the selective style entries and their dependencies. The build rejects missing dependencies and cycles, checks the manifest against Sass's parsed full-stylesheet imports, and verifies the component dependencies retained by tree-shaking, including lazy imports.

`bun run slider:check` covers slider geometry, keyboard, pointer, resize and lifecycle. To compare with a previous build, pass `--reference=<directory>` to `scripts/check-slider.ts`; the directory must contain an ESM `slider.js` exporting `createSlider` and its full `styles.css`. Screenshots and measurements go to `analysis/slider-dom`.

Builds fail on TypeScript or Sass errors. The published ESM is readable and includes declarations; source maps are left out of the package to keep installs small.

## Pull Request Process

1. Branch from `main`; one topic per pull request.
2. Include the tests, the `CHANGELOG.md` entry under `[Unreleased]` and, for a new option or behaviour, the md3.io docs change.
3. A change that breaks the public API or the rendered DOM goes under **Changed (breaking)** with a `Migration:` line.
4. CI must pass: types, lint, tests, build, size and adapter budgets, and the browser checks (components, elements, adapters). `main` accepts merge commits only, from up-to-date branches.
5. Reference the issue the change closes.

## Testing

```bash
bun test                                   # the unit suite
bun test test/components/button.test.ts    # one file
bun run test:coverage                      # with a coverage report
```

- Tests live in `test/`, mirroring `src/`, and end in `.test.ts`; `bun run test:naming` fails on a suite the runner would not collect.
- A test file that needs the DOM creates a JSDOM at its top, as most do, or imports `test/setup.ts` for the shared one.
- Test the real component through its public API and its DOM: no mock copies of components. Add or update the tests in the same commit as the change, and check that they fail without it.
- Behaviour that needs a real browser (focus, layout, the top layer, form association, motion) goes in the browser checks, which CI runs in groups side by side:
  - `bun run elements:check` and `shadow-styles:check` for the elements;
  - `react:check`, `vue:check`, `svelte:check`, `solid:check` and the adapters' SSR checks for the adapters;
  - `consumer:check` and the per-component checks (`tabs:check`, `slider:check`, `drawer:check`, `core:check`, …) for the factories and the packed build;
  - `preupgrade:check` and `tokens:check` for the styles;
  - `ssr:check` for server rendering, in Chromium, Firefox and WebKit.

  Install Chromium once with `node node_modules/playwright/cli.js install chromium`.
- A new check goes in one of those groups in `.github/workflows/ci.yml` and in the list in `test/build/ci-commands.test.ts`, which fails when CI stops running a command. A run takes as long as its slowest group, so give a long check a group of its own.

## Documentation

- TypeDoc comments on every public function and type, with an `@example`.
- The file path as a comment on the first line of each file.
- User documentation lives in md3.io's `docs/components/<name>.md`, where `bun run docs:check` type-checks and runs every example against your mtrl checkout. Add or update the page with the change.

## Community and Communication

- Submit issues for bugs or feature requests
- Join the discussion on existing issues
- Be respectful and constructive in communications

## License

By contributing to mtrl, you agree that your contributions will be licensed under the project's MIT License.

---

Thank you for contributing to mtrl! Your efforts help make this library better for everyone.

## Releasing

Releases are published by GitHub Actions with npm trusted publishing
(`.github/workflows/publish.yml`); no npm token is involved.

1. Open a release pull request that bumps `package.json` (`x.y.z`, or
   `x.y.z-next.N` for a pre-release), turns `[Unreleased]` in `CHANGELOG.md`
   into the version's section, and updates the README where the release
   changes it. Merge it when CI passes.
2. Tag the merge commit `vx.y.z` and push the tag:

   ```bash
   git tag -a vx.y.z -m "vx.y.z" <merge commit>
   git push origin vx.y.z
   ```

3. The workflow checks that the tag matches the version, builds, and
   publishes: a pre-release under the `next` dist-tag, a release under
   `latest`. `npm view material dist-tags` confirms.

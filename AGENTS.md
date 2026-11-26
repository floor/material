# AGENTS.md

How this repository is built, checked and shipped. Written for coding agents and precise enough
to follow without guessing. Every command below was run in this checkout, with its output quoted.

## Layout

- `src/components/` — one folder per component: `index.ts`, the factory (`<name>.ts`),
  `config.ts`, `types.ts`, `constants.ts`, and `features/` when it has several.
- `src/elements/` — the custom elements (`<m-button>`) that wrap the factories: one spec per
  element, with its attributes, properties, events and slots.
- `src/styles/` — Sass: `main.scss`, `components/_<name>.scss`, `themes/`, the token modules,
  and `abstract/_mixins.scss`.
- `scripts/` — the build, the size checks, the browser checks (`check-*.ts`) and
  `scripts/conformance/`, the Material 3 measurement tooling.
- `test/` — the unit suite, mirroring `src/`, files ending `.test.ts`.

## A component

A factory is composed with `pipe`: each `with*` feature adds one capability and returns the
object. `src/components/divider/` is the smallest real example.

A new component touches these places:

- `src/components/<name>/`, exported from `src/components/index.ts`;
- `src/styles/components/_<name>.scss`, imported by `src/styles/main.scss` and declared in
  `scripts/style-manifest.ts`; colours, type, shape and motion come from tokens, never literals;
- `src/elements/<name>.ts` for the element, and the adapters the build generates from it;
- `scripts/size.ts` for its size budget;
- `.changes/<slug>.md`, one changelog fragment (see the commit format below).

The element layer wraps a factory: the spec names the tag, its attributes and properties, its
events and its shadow stylesheets; the factory is the implementation and stays public on its own.

## Install and the checks

Bun 1.4.2 is what CI runs. Playwright drives the browser checks; its browsers are installed once.

```console
$ bun install --frozen-lockfile
341 packages installed [766.00ms]

$ bunx playwright install chromium   # add webkit for the WebKit runs
```

The local gate, in the order that fails fastest:

```console
$ bun run build
Built material 3.16.7 in ./dist

$ bun run ts:check
$ tsc --noEmit --skipLibCheck

$ bun run lint
$ bunx eslint src scripts --ext .ts,.tsx

$ bun test ./test/components/button/button.test.ts
 28 pass
 0 fail

$ bun run scripts/check-dialog-small-viewport.ts
Dialog small viewport check passed.

$ bun run ids:check
check-internal-ids: no internal references in the tracked files

$ bun run public-names:check
check-public-names: no seat or persona names in the tracked files

$ bun run changelog:check
changelog:check: 0 fragment(s); no src/ change
```

`ts:check` and `lint` print nothing beyond their script line when they pass. Browser checks are
files under `scripts/check-*.ts`, run directly with Bun; each ends with a sentence like
`Dialog small viewport check passed.` and exits non-zero on a failure. A check written for a fix
must fail on the code before it and pass after; quote both runs in the pull request.

## Conformance measurements

`scripts/conformance/` measures the library against Material 3, in Chromium and WebKit, and
returns JSON.

```console
$ bun run conformance --list
... 37 fixture names ...
top-app-bar

$ bun run conformance divider
{
  "source": "src",
  "engine": "chromium",
  "rows": [ { "id": "full-width/horizontal/ltr/light", "state": "rest", ... } ]
}
```

Compose tokens come from the pinned AndroidX checkout; `scripts/conformance/README.md` has the
clone commands and the `COMPOSE_TOKENS_DIR` setup. Each component's page on
[md3.io](https://md3.io/components/) carries its *Known issues* section, the published view of the
conformance measurements.

## Material 3 sources and their pins

- **Compose Material 3 1.5.0** is the current stable release (`androidx.compose.material3`, per
  Google's Maven metadata).
- **`08ec699d5ada44a374a61c892f3701e941916a0f`** on `androidx-main` is the tooling pin whose
  `ShapeTokens.kt` is stamped `41.1.19`.
- **m3.material.io** is read through a reader, e.g.
  `https://r.jina.ai/https://m3.material.io/m3/pages/<page>/<section>`, and linked in the pull
  request. Never from memory, and never from another library's behaviour.

## Size budgets and pins

- `scripts/budgets.ts` — the explicit byte ceilings (packed package, tarball, unpacked, CSS).
- `scripts/size.ts` — the per-component gzip budgets, and the commitment that `SIZES.md` matches
  its measurement: `bun run size` ends with `✓ SIZES.md: the committed table matches this measurement`.
- `SIZES.md` and the sizes table in `README.md` and `npm-readme.md` — the committed figures.
- `scripts/fixtures/sass-config-baseline.json` — the frozen Sass sources digest and the payload
  digests of the packed JS and CSS.

Raise a ceiling only when a measurement is over it, to the measured value plus 10 B, and state
the figure in the pull request. The package job prints the measurement:

```console
$ bun run size:check
npm package: 919,893 bytes compressed, 5,258,247 unpacked, 1,303 files (packed with Node v26.8.1 / npm 11.19.0)
```

The packer's figure depends on its Node and npm, so take the ceiling from the CI run, not from a
local one. When the payload map drifts, the package job prints each path with its new digest;
replace that line only, and leave `tested`, `branch`, `ci` and `mainRevision` as they are.

## The CI gate

`.github/workflows/ci.yml` runs, on every pull request: `static` (types, lint, test naming, test
types, internal ids, public names), `tests`, `build`, `package` (the size checks, the packed
package, README and styles) and `browser`, a matrix of groups that each run a few
`scripts/check-*.ts` files through the `package.json` scripts, plus `identity`, `comparators` and
`ssr-worker`. The `check` job passes only when every one of them does. A new check is added to
one of the `browser` groups in `ci.yml` and to the list in `test/build/ci-commands.test.ts`.

## Commit and pull request format

- Branch from `main`; one topic per branch and per pull request.
- Conventional commits, one idea per commit, titled `fix(scope): …`, `feat(scope): …` and so on.
  A change driven by the specification names its Material source in the commit body.
- Plain merge commits only; squash is never used.
- Every change ships with a `.changes/<slug>.md` fragment; only a release pull request edits
  `CHANGELOG.md`, and it deletes the fragments it assembles.
- A pull request body carries the measurement: the failing check before and the passing one
  after, with both runs quoted, and any size ceiling it raised with its measured figure.

## Never

- squash;
- force-push a branch that has been reviewed;
- add public API in a patch release;
- edit `CHANGELOG.md` outside a release pull request;
- put tracker ids, seat names or persona names in public text — `bun run ids:check` and
  `bun run public-names:check` hold this;
- hand-edit a generated file: the `SIZES.md` table comes from `bun run size`, the declarations
  and adapters from the build, and the selector census and payload pins from re-running the
  check that owns them.

# AGENTS.md

How this repository is built, checked and shipped, written for coding agents and precise enough
to follow without guessing. Every command below was run in this checkout with its output quoted.

The contributor guide is [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md): the setup, the
conventions, the review process and this file's short form.

## Layout

- `src/components/` — one folder per component: `index.ts`, the factory (`<name>.ts`),
  `config.ts`, `types.ts`, `constants.ts`, and `features/` when it has several.
- `src/elements/` — the custom elements (`<m-button>`) that wrap the factories: one spec per
  element, with its attributes, properties, events and slots.
- `src/styles/` — Sass: `main.scss`, `components/_<name>.scss`, `themes/`, the token modules and
  `abstract/_mixins.scss`.
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
- `src/elements/<name>.ts` for the element; the adapters are generated from it by the build;
- `scripts/size.ts` for its per-component budget;
- `.changes/<slug>.md`, one changelog fragment (see below).

The element layer wraps a factory: the spec names the tag, its attributes and properties, its
events and its shadow stylesheets; the factory is the implementation and stays public on its own.

## Install and the local checks

Bun 1.4.2 is what CI runs. Playwright drives the browser checks; its browsers are installed once.

```console
$ bun install --frozen-lockfile
341 packages installed [766.00ms]

$ bunx playwright install chromium   # add webkit for the WebKit runs; nothing is printed when installed
```

The local gate, in the order that fails fastest:

```console
$ bun run build
Built material <version> in ./dist

$ bun run ts:check
$ tsc --noEmit --skipLibCheck

$ bun run lint
$ bunx eslint src scripts --ext .ts,.tsx

$ bun test ./test/components/button/button.test.ts
 28 pass
 0 fail

$ bun run test:naming
check-test-naming: every file defining tests is collectable

$ bun run scripts/check-dialog-small-viewport.ts
Dialog small viewport check passed.

$ bun run ids:check
check-internal-ids: no internal references in the tracked files

$ bun run public-names:check
check-public-names: no seat or persona names in the tracked files

$ bun run changelog:check
changelog:check: 0 fragment(s); no src/ change
```

`ts:check` and `lint` print nothing beyond their script line when they pass.

Steps a change can break, run when the change reaches them:

```console
$ bun run size
  ✓ SIZES.md: the committed table matches this measurement

$ bun run size:check
npm package: <bytes> bytes compressed, <bytes> unpacked, <files> files (packed with Node <version> / npm <version>)

$ bun run styles-package:check
Passed styles package: 15 public Sass entries compile from the packed tarball to the checkout's own CSS, and 3 internal partials are absent.

$ bun run readme:check
README.md and npm-readme.md: 22 scripts compiled, 45 specifiers resolved, 65 tags checked, 79 links

$ bun run docs-imports:check
65 documented imports of material: 45 statements compiled against the packed package, 14 Markdown files and 643 sources read.
```

`size:check` and `styles-package:check` read `dist/`, so run `bun run build` first. A change to
`src/styles/` can also fail `size:check`, `styles-package:check` and `test/styles/sass-config.test.ts`
together; see *Size budgets and pins*.

`changelog:check` compares the committed branch with `main`: an uncommitted `src/` edit still
prints `changelog:check: 0 fragment(s); no src/ change`, so commit before trusting it.

## Browser checks

A browser check is a file `scripts/check-<what>.ts`, run with Bun. It bundles the factory or the
element with `Bun.build`, compiles the styles with Sass, serves one page with `Bun.serve`, opens
it with Playwright and asserts on measured values. Copy `scripts/check-divider-sheet-conformance.ts`:
it shows the virtual entry for `Bun.build`, `compileString` with `src/styles` on the load path,
`launchChromium` from `scripts/browser-profile.ts` (which keeps the browser profile inside the
worktree) and the per-case assertions.

`launchChromium` is Chromium only. For a second engine, launch `webkit` from Playwright the way
`scripts/check-dialog-small-viewport.ts` does, and run the same function twice:

```ts
import { webkit, type Browser } from "playwright";

let browser: Browser | null = null;
try { browser = await webkit.launch({ headless: true }); }
catch { console.log("<what>: WebKit not installed here, skipped"); }
if (browser) { try { await run(browser, "webkit"); } finally { await browser.close(); } }
```

```console
$ bunx playwright install webkit   # nothing is printed when it is already installed
```

Reduced motion does not stop a CSS transition — it only changes what the stylesheet does — so a
check that reads a value mid-transition reads the wrong one. Wait for the settled state before
measuring: `await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished))`, or poll
the computed value until two readings agree, as `scripts/check-search-avatar.ts` does.

End the file with one sentence saying it passed, so the last line is the verdict:

```console
$ bun run scripts/check-dialog-small-viewport.ts
Dialog small viewport check passed.
```

A check written for a fix must fail on the code before it and pass after. Quote both runs in the
pull request.

To run a check in CI: add a `package.json` script such as `"menu-container-space:check": "bun run
scripts/check-menu-container-space.ts"`, add that script to a `browser` group's `checks:` line in
`.github/workflows/ci.yml`, and add the script name to the list in
`test/build/ci-commands.test.ts` (the test fails when CI stops running a command). Choose the
group by area when a fitting one exists — `components-a`/`components-b` for factories,
`elements-a`/`elements-b` for the elements, `shadow-styles` for the styles — and give a slow
check a group of its own, because a run takes as long as its slowest group. The group's
`browsers:` field picks the engines CI installs and runs: a check that launches WebKit needs a
group whose field lists it (`chromium firefox webkit`, as `listbox` has, or `firefox webkit`, as
`ssr-b` has), or `webkit` added to that group's field.

A check writes no temporary file under `scripts/`. Build its entry in memory with `Bun.build`, as
`scripts/check-divider-sheet-conformance.ts` does with a virtual entry, and clean up anything it
does write.

To mount a custom element with its shadow stylesheets, register the sheets and define the element
from the page, as `scripts/search-avatar-entry.ts` does: it exposes `registerStyles` and
`defineSearch` on the window, and the page calls `registerStyles(sheets)` with the compiled
component and `ripple` CSS before `defineSearch()`. `scripts/check-search-avatar.ts` is the whole
pattern, for both a factory and an element.

## Conformance measurements

`scripts/conformance/` measures the library against Material 3, in Chromium and WebKit, and
returns JSON. Use the source build for a development measurement and an exact-head `dist/` for
what ships: the result says which it read.

```console
$ bun run conformance --list
... 37 fixture names ...
top-app-bar

$ bun run conformance divider
{
  "source": "dist",
  "engine": "chromium",
  "rows": [ { "id": "full-width/horizontal/ltr/light", "state": "rest", ... } ]
}
```

`"source"` reads `dist` once `dist/` exists, as after `bun run build`, and `src` when the
fixture had to bundle the checkout instead. A row
is one case: its `id` carries the variant, size, state, density, zoom or colour scheme it was
measured in, and `parts` holds the measured values per named part. To answer a spacing question,
read the row whose `id` has the variant, size and state you care about, compare its part's
`width`/`height`/`x`/`y` (or the CSS values) with the reference, and change the fixture only when
it has no case for the combination you need. `--case=<text>` runs the cases whose id contains
that text:

```console
$ bun run conformance button --case=filled/m/rest
{ "source": "dist", "engine": "chromium", "rows": [ { "id": "filled/m/rest", ... } ] }
```

Compose tokens come from the pinned AndroidX checkout; `scripts/conformance/README.md` has the
clone commands and the `COMPOSE_TOKENS_DIR` setup. Where a component's page on
[md3.io](https://md3.io/components/) lists a *Known issues* section, that is the published view of
the conformance measurements.

## Material 3 sources and their pins

- **Compose Material 3 1.5.0** is the current stable release (`androidx.compose.material3`, per
  Google's Maven metadata).
- **`08ec699d5ada44a374a61c892f3701e941916a0f`** on `androidx-main` is the tooling pin whose
  `ShapeTokens.kt` is stamped `41.1.19`.
- **m3.material.io** is read through a reader, e.g.
  `https://r.jina.ai/https://m3.material.io/m3/pages/<page>/<section>`, and linked in the pull
  request. Never from memory, and never from another library's behaviour.

A value that a Compose token states is enough: name the token file and line at the pin. A decision
the tokens do not carry — what a state looks like, when a layer applies, how a control behaves —
is a guideline question, read on m3.material.io on the day, with the date in the pull request. When
the two disagree, say so and state which one the change follows and why.

## Changelog fragments

A change under `src/` ships with one file in `.changes/`; the directory is created by the first
fragment. `bun run changelog:check` fails a branch that touches `src/` without one, and fails a
branch other than `release/*` that edits `CHANGELOG.md`.

```markdown
Section: Fixed
Migration: Replace `createThing()` with `createOtherThing()`.

**What changed.** Why it changed, what stays the same, and the measured before and after.
```

`Section` is `Added`, `Changed`, `Deprecated` or `Fixed`. `Migration` is optional and only for a
change a consumer must act on. The bold lead names the component; its pull request link is added
after the pull request exists — a follow-up commit on the branch, or left out, because the release
pull request assembles the section from the fragments as written. Name the file `<slug>.md`; a date
prefix orders it within its section.

## Size budgets and pins

- `scripts/budgets.ts` — the explicit byte ceilings (packed package, tarball, unpacked, CSS).
- `scripts/size.ts` — the per-component gzip budgets in `kb(n)` steps, and the `SIZES.md` table
  that must match its measurement.
- `SIZES.md` and the sizes table in `README.md` and `npm-readme.md` — the committed figures.
- `scripts/fixtures/sass-config-baseline.json` — the frozen Sass source digests (`sources`) and
  the payload digests of the packed JS and CSS (`payloads`).

**One rule:** raise a ceiling only when a measurement is over it, to the measured value plus at
least 10 B, rounded up to the next 10 — and state the figure in the pull request. Nothing else
raises a ceiling. The ceiling tracks the measurement in both directions: when a later change
measures lower than the figure its ceiling was set from, the ceiling comes down to the new
measured value plus at least 10 B in the same commit.

**Take the figure from CI, not from here.** The packer's output depends on its Node and npm; the
package job prints the authoritative figure. To reproduce it locally:

```console
$ npx -y -p node@22 -p npm@10 -- bun run size:check
npm package: <bytes> bytes compressed, <bytes> unpacked, <files> files (packed with Node <version> / npm <version>)
```

The packer can differ from CI's by a few bytes run to run; CI's figure governs.

A raised ceiling carries a comment saying the measured figure, the CI run it came from, and
`the next 10 B`, with the line it replaces as `Preceding:`. An older figure stays in the chain as
history; delete nothing.

A CSS change can move the packed output in three places:

1. `size:check` — the packed package, the tarball, the unpacked size and the CSS budgets;
2. `styles-package:check` — the packed Sass entries against the checkout's own CSS, and the
   payload map;
3. `test/styles/sass-config.test.ts` — the frozen `sources` digests, where `sources.main` fails
   first and alone when the change is confined to that entry. Run it, read the digest the
   assertion prints, and put that value in the file.

`sources.main` fails first and alone when the change is confined to that entry; a theme or element
change moves `main`, `themes` and the theme's own entry too, so refresh every affected entry the
check names. Whatever moved, update the comment above the loop in
`test/styles/sass-config.test.ts` that says why, naming the change and its file. When the payload
map drifts, the package job prints each path with its new digest; replace that line and leave
`tested`, `branch`, `ci` and `mainRevision` as they are.

`readme:check` fails CI on a stale size row, so a pull request that moves a size updates the rows
in `README.md` and `npm-readme.md` itself, to the figure the run prints.

## The CI gate

`.github/workflows/ci.yml` runs, on every pull request: `static` (types, lint, test naming, test
types, internal ids, public names), `tests`, `build`, `package` (the size checks, the packed
package, README and styles) and `browser`, a matrix of groups that each run a few
`scripts/check-*.ts` files through the `package.json` scripts, plus `identity`, `comparators` and
`ssr-worker`. The `check` job passes only when every one of them does. A new check is added to
one of the `browser` groups in `ci.yml` and to the list in `test/build/ci-commands.test.ts`.

## Commit and pull request format

- Branch from `main`; one topic per branch and per pull request.
- Conventional commits, one idea per commit: `fix(scope): …`, `feat(scope): …`, `docs: …`.
- Plain merge commits only; squash is never used.
- A change under `src/` ships with a `.changes/<slug>.md` fragment; a documentation-only change
  needs none. Only a release pull request edits `CHANGELOG.md`.
- A spec-driven change names its source in the commit body, after the description:

  ```text
  fix(button): the pressed container keeps its 20 dp corner

  The pressed state drew 4 dp where the container is 20 dp. ShapeTokens.kt,
  CornerSmall, Compose Material 3 1.5.0 with the tooling pin 08ec699d.

  Agent: <name> · <role>
  ```

- A pull request body carries, in this order: what was wrong and how it was measured; the failing
  run on the code before the change and the passing run after, both quoted; a link to the source
  it follows; when it changed size, the measured figure and the ceiling it raised.
- A branch that has been reviewed is not force-pushed; a review fix is a new commit.

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

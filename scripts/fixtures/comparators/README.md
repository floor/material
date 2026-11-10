# Rendered styled comparators

Private tooling for the accepted M3E, Beer CSS and MICL identities. `contract.json`
pins their public entries, toolchain, app roles and honest gaps. The nested npm
lock is resolved and installed in CI only. None of these files or dependencies
ships in the material tarball; the CI runner verifies the packed members.

`comparators:check` is a CI-only gate. CI builds material once, downloads that
artifact, stages the same candidate package consumers receive, installs this
private lock, and runs a matrix of six adapters (the three libraries and material
factory/element/Material Web controls). Each builds a button and an app page.
There is no competitive byte budget or automatic ranking.

The rendered contract is version 2. Markup, setup, styles and public interaction
wiring count. Reports distinguish **rendered roles** from **behavior checked**;
pointer state observations, public value changes, menu selection, Escape/focus
observations and open/close checks are not complete keyboard or focus parity.
Every attempted capability probe records its state change or gap. No full-app ranking is allowed without that evidence. MICL does not gain
invented tabs/FABs; its requested 16-role fixture is incomplete. Each report names
its unverified states rather than treating them as passing or failed support.

The immutable `legacy-import-closure` inputs, provenance and results were copied
from the November 9 analysis at material 3.10.1. They are historical transfer
measurements, not rendered parity evidence: the Material Web input imported
registrations but mounted no controls. Do not regenerate, edit, or blend those
rows with the versioned rendered contract. Unit checks pin their bytes.

## Accounting

Vite 8.2.2, ES2022 production HTML builds, extracted CSS, zero asset inlining,
no module-preload polyfill, and hidden source maps. Text files are compressed
individually at gzip 9 / Brotli 11. JavaScript is minified; CSS minification is
uniformly disabled for all six adapters. The pinned Vite/Lightning CSS minifier
rejects MICL's `::picker(select):popover-open` selector (CI 42827379159). No
upstream rule is rewritten or dropped to accommodate that parser limitation. Binary assets count as raw transfer bytes.
The ledger includes the HTML/inline artwork and separate JS/CSS/binary totals.
Static JS/CSS imports form the initial closure. CSS URL assets are inventoried,
but a font-face declaration alone is not a network fetch; binary resources join
initial totals only when observed before readiness. Observed dynamic requests
before readiness are also initial; post-readiness requests have their own phase.
Full declared dynamic closure and all emitted files are separate bounds, never mislabeled as a measured download.
Hashes and duplicate-free final asset names make the accounting auditable.
Vite's removed CSS-only JavaScript placeholders are resolved from a pre-removal
snapshot only when every module is CSS; their emitted styles remain in the
closure. A missing JavaScript dependency is never discarded by that rule.

External requests fail. Beer CSS's pinned CDN font URLs are relocated to its own
installed assets with hashes; they are not removed. Included SVG/data assets
count in the file carrying them. The primary Beer entry includes global CSS/JS;
MICL uses published UMD modules and distributed CSS, not assumed tree-shaking.
M3E includes its theme initialization and peers; its app explicitly loads the
pinned Material Symbols font distributed by Beer CSS for internal icon fallbacks. Dynamic theme generation is not
part of these static light-theme cases; any retained chunks still appear.

Artifacts retain exact versions, candidate/checkout SHA, lock digest, browser
version, source modules, emitted bytes/hashes, request phases, capability outcomes,
screenshots and traces, including partial results when a later assertion fails.
There are no local heavy runs and no speed or blanket conformance claims.

Package/source references: [M3E](https://github.com/matraic/m3e),
[Beer CSS](https://github.com/beercss/beercss),
[MICL](https://github.com/henkpb/micl). Versions are fixed in the nested manifest,
not fetched from a floating CDN URL or dist-tag during a comparison.

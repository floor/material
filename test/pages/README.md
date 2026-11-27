# Component test pages

One page per component, on the shared harness: the same toolbar (light/dark,
RTL, density, slow motion), the same section order (Variants & sizes →
States → Interaction → Edge cases), and one scenario block per item — title,
what to look for, the expected result, and an on-page measurement where one
exists.

## Open them

```sh
bun run build        # dist/ must exist: the pages load the factories from it
bun run test:pages   # serves /dist/ and /test/pages/ on http://127.0.0.1:<port>
```

Then open `http://127.0.0.1:<port>/` — it redirects to `/test/pages/`, and that
index links every page. A component page loads the sheet and its factory with
the same relative path the Sound slider uses (`../../../../dist/…` from
`test/pages/components/<name>/`), so what it shows is always the current build.
`/dist/` is the build and `/test/pages/` is this folder; `file://` blocks ESM
modules.

## Pages

- `components/split-button/` — sizes xs–xl in both directions; the chevron's painted centre readout, closed and open.
- `components/fab-menu/` — every placement; the long-list fit-then-shift readout.
- `components/carousel/` — drag, flick, trackpad overscroll; the scroll readout with ghost lines.
- `components/bottom-sheet/` — standard and modal; drag and settle with the state/offset readout.
- `components/drawer/` — diagram paddings, child indent, chevron ink vs badge, density, the section reveal next to the menu (5x slow motion).
- `components/progress/` — buffer colour candidates; value scrubbing.
- `components/slider/` — the handle on the tick scale, pressed handle, ends readout, and the Sound demo (media and alarm volume) whose checks read this page.
- `components/radios/` — `ripple: false` still paints the keyboard focus ring and the focus layer.
- `components/select/` — the trailing arrow takes its colour with the field, and rotates 180° while the menu is open.
- `components/extended-fab/` — undefined variant and width match omitted ones; a defined global variant wins.
- `components/tooltip/` — an undefined variant matches an omitted one; a global default wins.

## Harness

`shared/harness.js` builds the header (component name + the commit dist was
built from), the toolbar, the section/scenario scaffolding, and the slow
motion switch — `playbackRate 0.2` on every running transition in the
document and in each shadow root, re-armed on `transitionrun` and
`transitionstart` so closing transitions are slowed as they begin.

The archived originals of these pages live outside the repo
(`docs/projects/material/tests/components/`); this folder is the source of
truth now.

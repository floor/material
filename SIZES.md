# Component sizes

Measured by `bun run size` (scripts/size.ts). Each row imports only that
component's factories from the package entry, the way a consumer does, and
the numbers are what a bundler keeps. Minified and Gzipped are the initial
graph — the static chunks the import pulls in before any lazy load.
Deferred is the gzip of the chunks reached only through `import()`, which
loads on demand. `vs core` is the gzipped delta against the `core` kernel
(`pipe`, `createBase`, `withElement`) that every component starts from. A
scenario that carries another component's code fails the run, not this table.

Measured at 102f6efe on 2026-11-08. Regenerate with
`bun run size --markdown > SIZES.md`; a plain `bun run size` fails when
these rows drift from a fresh measurement.

<!-- size-table -->
| Component | Minified | Gzipped | vs core | Deferred |
| --- | ---: | ---: | ---: | ---: |
| core | 7.7 KB | 3.0 KB | — |  |
| badge | 15.4 KB | 5.3 KB | +2.2 KB |  |
| bottom-app-bar | 11.1 KB | 4.1 KB | +1.1 KB |  |
| bottom-sheet | 19.4 KB | 7.1 KB | +4.0 KB |  |
| side-sheet | 17.8 KB | 6.5 KB | +3.5 KB |  |
| button | 21.9 KB | 7.4 KB | +4.4 KB | +6.9 KB |
| button-group | 36.6 KB | 11.8 KB | +8.8 KB | +6.9 KB |
| card | 19.5 KB | 6.6 KB | +3.6 KB | +9.7 KB |
| carousel | 30.3 KB | 11.2 KB | +8.1 KB |  |
| checkbox | 16.4 KB | 5.7 KB | +2.6 KB |  |
| chips | 27.9 KB | 9.1 KB | +6.1 KB |  |
| datepicker | 37.3 KB | 12.8 KB | +9.7 KB |  |
| dialog | 37.5 KB | 12.1 KB | +9.1 KB | +6.9 KB |
| divider | 9.7 KB | 3.7 KB | +0.7 KB |  |
| drawer | 22.9 KB | 8.2 KB | +5.1 KB |  |
| fab | 15.1 KB | 5.4 KB | +2.3 KB |  |
| fab-menu | 22.1 KB | 8.2 KB | +5.1 KB | +10.5 KB |
| extended-fab | 17.3 KB | 6.0 KB | +2.9 KB |  |
| icon-button | 18.7 KB | 6.3 KB | +3.3 KB |  |
| list | 19.0 KB | 6.7 KB | +3.6 KB |  |
| menu | 38.6 KB | 12.5 KB | +9.4 KB | +2.1 KB |
| navigation-bar | 16.1 KB | 6.0 KB | +2.9 KB |  |
| navigation-rail | 18.5 KB | 6.8 KB | +3.7 KB |  |
| progress | 28.9 KB | 10.5 KB | +7.5 KB |  |
| loading-indicator | 22.9 KB | 9.3 KB | +6.3 KB |  |
| split-button | 27.5 KB | 9.5 KB | +6.4 KB | +16.9 KB |
| radios | 15.1 KB | 5.2 KB | +2.1 KB |  |
| search | 32.2 KB | 10.8 KB | +7.8 KB |  |
| select | 41.9 KB | 13.2 KB | +10.1 KB | +10.5 KB |
| slider | 34.0 KB | 11.9 KB | +8.9 KB |  |
| snackbar | 36.1 KB | 11.9 KB | +8.9 KB | +6.9 KB |
| switch | 18.7 KB | 6.2 KB | +3.2 KB |  |
| tabs | 41.8 KB | 13.4 KB | +10.3 KB | +6.9 KB |
| text-field | 28.9 KB | 8.9 KB | +5.9 KB |  |
| timepicker | 31.7 KB | 11.0 KB | +7.9 KB |  |
| top-app-bar | 12.7 KB | 4.4 KB | +1.4 KB |  |
| tooltip | 16.8 KB | 6.0 KB | +3.0 KB |  |
| toolbar | 33.3 KB | 11.1 KB | +8.0 KB | +6.9 KB |
| all | 393.1 KB | 123.3 KB | +120.3 KB | +2.1 KB |
<!-- /size-table -->

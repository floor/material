# Component sizes

Measured by `bun run size` (scripts/size.ts). Each row imports only that
component's factories from the package entry, the way a consumer does, and
the numbers are what a bundler keeps. Minified and Gzipped are the initial
graph — the static chunks the import pulls in before any lazy load.
Deferred is the gzip of the chunks reached only through `import()`, which
loads on demand. `vs core` is the gzipped delta against the `core` kernel
(`pipe`, `createBase`, `withElement`) that every component starts from. A
scenario that carries another component's code fails the run, not this table.

Measured at 08742c5f on 2026-11-08. Regenerate with
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
| card | 19.9 KB | 6.8 KB | +3.7 KB | +9.7 KB |
| carousel | 30.6 KB | 11.3 KB | +8.3 KB |  |
| checkbox | 16.4 KB | 5.7 KB | +2.6 KB |  |
| chips | 27.9 KB | 9.1 KB | +6.1 KB |  |
| datepicker | 36.4 KB | 12.9 KB | +9.9 KB |  |
| dialog | 37.5 KB | 12.2 KB | +9.1 KB | +6.9 KB |
| divider | 9.7 KB | 3.7 KB | +0.7 KB |  |
| drawer | 23.1 KB | 8.2 KB | +5.2 KB |  |
| fab | 15.1 KB | 5.4 KB | +2.3 KB |  |
| fab-menu | 22.1 KB | 8.2 KB | +5.1 KB | +10.5 KB |
| extended-fab | 17.3 KB | 6.0 KB | +2.9 KB |  |
| icon-button | 18.7 KB | 6.3 KB | +3.3 KB |  |
| list | 19.9 KB | 7.0 KB | +3.9 KB |  |
| menu | 38.6 KB | 12.5 KB | +9.4 KB | +2.1 KB |
| navigation-bar | 16.1 KB | 6.0 KB | +2.9 KB |  |
| navigation-rail | 18.5 KB | 6.8 KB | +3.7 KB |  |
| progress | 28.9 KB | 10.5 KB | +7.5 KB |  |
| loading-indicator | 22.8 KB | 9.3 KB | +6.3 KB |  |
| split-button | 27.5 KB | 9.5 KB | +6.4 KB | +17.0 KB |
| radios | 15.1 KB | 5.2 KB | +2.1 KB |  |
| search | 32.3 KB | 10.9 KB | +7.9 KB |  |
| select | 40.8 KB | 13.0 KB | +10.0 KB | +10.5 KB |
| slider | 34.0 KB | 11.9 KB | +8.9 KB |  |
| snackbar | 36.7 KB | 12.1 KB | +9.1 KB | +6.9 KB |
| switch | 18.8 KB | 6.2 KB | +3.2 KB |  |
| tabs | 41.9 KB | 13.4 KB | +10.4 KB | +6.9 KB |
| text-field | 27.9 KB | 8.7 KB | +5.7 KB |  |
| timepicker | 32.8 KB | 11.3 KB | +8.3 KB |  |
| top-app-bar | 12.7 KB | 4.4 KB | +1.4 KB |  |
| tooltip | 17.4 KB | 6.2 KB | +3.1 KB |  |
| toolbar | 33.3 KB | 11.1 KB | +8.0 KB | +6.9 KB |
| all | 395.7 KB | 124.9 KB | +121.9 KB | +2.1 KB |
<!-- /size-table -->

# Component sizes

Measured by `bun run size` (scripts/size.ts). Each row imports only that
component's factories from the package entry, the way a consumer does, and
the numbers are what a bundler keeps. Minified and Gzipped are the initial
graph — the static chunks the import pulls in before any lazy load.
Deferred is the gzip of the chunks reached only through `import()`, which
loads on demand. `vs core` is the gzipped delta against the `core` kernel
(`pipe`, `createBase`, `withElement`) that every component starts from. A
scenario that carries another component's code fails the run, not this table.

Measured at af968e07 on 2026-11-01. Regenerate with
`bun run size --markdown > SIZES.md`; a plain `bun run size` fails when
these rows drift from a fresh measurement.

<!-- size-table -->
| Component | Minified | Gzipped | vs core | Deferred |
| --- | ---: | ---: | ---: | ---: |
| core | 8.2 KB | 3.1 KB | — |  |
| badge | 15.9 KB | 5.3 KB | +2.2 KB |  |
| bottom-app-bar | 11.6 KB | 4.2 KB | +1.1 KB |  |
| bottom-sheet | 20.4 KB | 7.2 KB | +4.1 KB |  |
| side-sheet | 18.8 KB | 6.7 KB | +3.6 KB |  |
| button | 22.8 KB | 7.5 KB | +4.4 KB | +6.8 KB |
| button-group | 37.4 KB | 11.9 KB | +8.8 KB | +6.8 KB |
| card | 20.4 KB | 6.7 KB | +3.6 KB | +9.6 KB |
| carousel | 30.7 KB | 11.2 KB | +8.1 KB |  |
| checkbox | 16.8 KB | 5.7 KB | +2.6 KB |  |
| chips | 28.4 KB | 9.2 KB | +6.1 KB |  |
| datepicker | 37.8 KB | 12.8 KB | +9.7 KB |  |
| dialog | 42.2 KB | 13.2 KB | +10.1 KB | +6.8 KB |
| divider | 10.2 KB | 3.8 KB | +0.7 KB |  |
| drawer | 23.9 KB | 8.4 KB | +5.3 KB |  |
| fab | 15.6 KB | 5.4 KB | +2.3 KB |  |
| fab-menu | 22.6 KB | 8.2 KB | +5.1 KB | +10.6 KB |
| extended-fab | 17.9 KB | 6.0 KB | +2.9 KB |  |
| icon-button | 19.2 KB | 6.4 KB | +3.3 KB |  |
| list | 19.6 KB | 6.8 KB | +3.6 KB |  |
| menu | 40.1 KB | 12.6 KB | +9.5 KB | +2.1 KB |
| navigation-bar | 16.6 KB | 6.0 KB | +2.9 KB |  |
| navigation-rail | 19.0 KB | 6.8 KB | +3.7 KB |  |
| progress | 29.5 KB | 10.5 KB | +7.4 KB |  |
| loading-indicator | 23.4 KB | 9.4 KB | +6.3 KB |  |
| split-button | 55.7 KB | 17.3 KB | +14.2 KB | +8.6 KB |
| radios | 15.5 KB | 5.2 KB | +2.1 KB |  |
| search | 32.8 KB | 10.9 KB | +7.8 KB |  |
| select | 69.2 KB | 20.7 KB | +17.6 KB | +2.1 KB |
| slider | 40.0 KB | 13.1 KB | +9.9 KB |  |
| snackbar | 37.1 KB | 12.0 KB | +8.9 KB | +6.8 KB |
| switch | 19.1 KB | 6.2 KB | +3.1 KB |  |
| tabs | 42.6 KB | 13.4 KB | +10.3 KB | +6.8 KB |
| text-field | 29.3 KB | 8.9 KB | +5.8 KB |  |
| timepicker | 32.2 KB | 11.1 KB | +8.0 KB |  |
| top-app-bar | 13.2 KB | 4.5 KB | +1.4 KB |  |
| tooltip | 17.5 KB | 6.1 KB | +3.0 KB |  |
| toolbar | 33.9 KB | 11.1 KB | +8.0 KB | +6.8 KB |
| all | 398.8 KB | 123.4 KB | +120.3 KB | +2.1 KB |
<!-- /size-table -->

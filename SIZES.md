# Component sizes

Measured by `bun run size` (scripts/size.ts). Each row imports only that
component's factories from the package entry, the way a consumer does, and
the numbers are what a bundler keeps. Minified and Gzipped are the initial
graph — the static chunks the import pulls in before any lazy load.
Deferred is the gzip of the chunks reached only through `import()`, which
loads on demand. `vs core` is the gzipped delta against the `core` kernel
(`pipe`, `createBase`, `withElement`) that every component starts from. A
scenario that carries another component's code fails the run, not this table.

Measured at 9968831f on 2026-11-28. Regenerate with
`bun run size --markdown > SIZES.md` on the release candidate.

<!-- size-table -->
| Component | Minified | Gzipped | vs core | Deferred |
| --- | ---: | ---: | ---: | ---: |
| core | 8.9 KB | 3.6 KB | — |  |
| badge | 16.7 KB | 5.8 KB | +2.2 KB |  |
| bottom-app-bar | 12.5 KB | 4.7 KB | +1.1 KB |  |
| bottom-sheet | 22.8 KB | 8.6 KB | +5.0 KB |  |
| side-sheet | 19.1 KB | 7.1 KB | +3.5 KB |  |
| button | 22.9 KB | 8.0 KB | +4.4 KB | +6.9 KB |
| button-group | 37.6 KB | 12.5 KB | +9.0 KB | +6.9 KB |
| card | 21.2 KB | 7.3 KB | +3.7 KB | +9.8 KB |
| carousel | 34.6 KB | 12.7 KB | +9.1 KB |  |
| checkbox | 17.7 KB | 6.2 KB | +2.6 KB |  |
| chips | 29.3 KB | 9.7 KB | +6.1 KB |  |
| datepicker | 37.7 KB | 13.4 KB | +9.9 KB |  |
| dialog | 38.6 KB | 12.8 KB | +9.2 KB | +6.9 KB |
| divider | 11.0 KB | 4.3 KB | +0.7 KB |  |
| drawer | 28.8 KB | 10.5 KB | +6.9 KB |  |
| fab | 16.4 KB | 5.9 KB | +2.3 KB |  |
| fab-menu | 30.4 KB | 10.7 KB | +7.1 KB | +11.3 KB |
| extended-fab | 18.9 KB | 6.6 KB | +3.0 KB |  |
| icon-button | 20.0 KB | 6.9 KB | +3.3 KB |  |
| list | 21.8 KB | 7.8 KB | +4.2 KB |  |
| menu | 42.1 KB | 13.9 KB | +10.4 KB | +2.1 KB |
| navigation-bar | 17.4 KB | 6.5 KB | +2.9 KB |  |
| navigation-rail | 19.9 KB | 7.3 KB | +3.8 KB |  |
| progress | 30.1 KB | 11.1 KB | +7.5 KB |  |
| loading-indicator | 24.1 KB | 9.8 KB | +6.3 KB |  |
| split-button | 28.5 KB | 10.1 KB | +6.5 KB | +17.9 KB |
| radios | 16.4 KB | 5.7 KB | +2.1 KB |  |
| search | 33.6 KB | 11.5 KB | +7.9 KB |  |
| select | 43.0 KB | 13.9 KB | +10.4 KB | +11.4 KB |
| slider | 36.1 KB | 12.7 KB | +9.1 KB |  |
| snackbar | 37.8 KB | 12.9 KB | +9.4 KB | +6.9 KB |
| switch | 20.1 KB | 6.8 KB | +3.2 KB |  |
| tabs | 42.8 KB | 14.0 KB | +10.4 KB | +6.9 KB |
| text-field | 29.5 KB | 9.4 KB | +5.8 KB |  |
| timepicker | 34.1 KB | 11.9 KB | +8.3 KB |  |
| top-app-bar | 14.0 KB | 5.0 KB | +1.4 KB |  |
| tooltip | 19.5 KB | 7.0 KB | +3.4 KB |  |
| toolbar | 34.4 KB | 11.8 KB | +8.2 KB | +6.9 KB |
| all | 412.2 KB | 131.4 KB | +127.8 KB | +2.1 KB |
<!-- /size-table -->

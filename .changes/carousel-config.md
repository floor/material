Section: Fixed

**Carousel configuration.** `CarouselConfig` now carries the base options every component takes (`parent`, `id`, `class` as a string or a list, `style`, `data`, `tabIndex`, the ARIA options): they already reached the root at runtime and were hidden from TypeScript. `setComponentDefaults("carousel", …)` is typed. `carousel.addClass("")` and `carousel.addClass("a b")` no longer throw. The accessible name is written once, and the example in the documentation reads the `change` payload's `value`.

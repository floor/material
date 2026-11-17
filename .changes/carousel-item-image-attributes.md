Section: Added

**Carousel items declare image `width`, `height`, `loading` and `decoding`.** `<m-carousel-item>` passes them into the slide on the first read and when they change. An explicit `loading` wins; otherwise the first image is eager and the rest are lazy. `decoding` and the intrinsic size are set only when given.

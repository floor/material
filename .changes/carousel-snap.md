Section: Fixed

**Carousel slides added and removed.** Adding a slide to a mounted carousel no longer removes and recreates the snap point of every slide: the carousel keeps the ones it has and adds one. Removing the last slide no longer leaves a snap point and the track's length behind. `addSlides(slides, index?)` adds several slides with one relabelling and one layout, where `addSlide` does both for each slide.

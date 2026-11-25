Section: Fixed

**Carousel drag after a click.** A pointer gesture moves focus to the slide under it, and the carousel's focus-follow — meant for the keyboard — took that focus as a selection: after a click, a drag, and the focus the release left on the leading slide, the strip glided back to the clicked slide even with snapping off. A drag's end now disarms focus-following until the next press or key, so a drag rests where it is released (snapping on still settles on the nearest snap), while a click still selects its slide and Tab, the arrows and Home/End keep their follow-focus.

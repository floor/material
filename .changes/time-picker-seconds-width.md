Section: Fixed

**Time picker with seconds.** M3's dialog width, 328 px, is what an hh:mm row needs; the seconds field is our extension and its row is wider — 388 px at 12h and 356 at 24h — so the content overflowed and the hour, or the AM/PM column, was clipped. A dialog holding seconds now takes the row's width (440 px, capped by the viewport), while the hours-and-minutes dialog keeps its M3 width exactly: 280 px for the 24h input, 304 px for the 24h dial, 328 px for 12h.

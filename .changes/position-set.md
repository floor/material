Section: Fixed

**`withPosition` (`material/core/compose`).** `setPosition()` now replaces the position: it removed the class of the first position on every call and `getPosition()` always returned that first position, so setting top, then left, then right left both `--left` and `--right` on the element. A position given as an enum key (`"END"`) is read by `setPosition()` as it is at creation.

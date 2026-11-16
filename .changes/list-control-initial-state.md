Section: Fixed

**A list row's trailing control and its selected state now agree from the start and at every clear.** A switch, checkbox or radio created checked selects its row at creation, and `clearSelection()`, `setSelection([])` and `deselectItem()` uncheck the row's control as well as dropping the selection, so the row never shows selected and unchecked at once.

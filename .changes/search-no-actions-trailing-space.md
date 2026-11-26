Section: Fixed

**A search bar with no trailing action leaves 16dp at its end.** The text ended 8px from the
bar's end when the bar had no clear button and no trailing items; Compose
`SearchBarTokens.ContainedNoActionsTrailingSpace` is 16dp. A bar with a trailing action keeps
its 4dp end space.

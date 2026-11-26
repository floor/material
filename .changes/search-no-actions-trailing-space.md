Section: Fixed

**A search bar with no trailing action leaves 16dp at its end ([#495](https://github.com/floor/material/pull/495)).** An empty bar's hidden clear button kept its 48px box, so the text ended 56px from the bar's end by default (8px with the clear button off); Compose `SearchBarTokens.ContainedNoActionsTrailingSpace` is 16dp. The hidden clear button now takes no room, the clear button still appears with its 4dp end space as you type, and a bar with a trailing item is unchanged.

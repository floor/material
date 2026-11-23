Section: Fixed

**`expandOnFocus: false` on search holds for the leading icon.** Activating the bar's search button — by click, Enter or Space — took focus into the input and opened the view, suggestions and scrim, although focus alone was asked not to open it; a list-filter search could be opened into its empty suggestions view by a stray activation. The icon now opens the view only when expansion on focus is allowed, and otherwise takes focus into the input and leaves the view closed. Programmatic `expand()`, the view's back arrow and every default configuration behave as before.

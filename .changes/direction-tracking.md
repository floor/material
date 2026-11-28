Section: Fixed

**Direction tracking.** A DOM change anywhere in the page no longer makes every mounted component read its direction again: the library reads the components in what was inserted or moved, and those under a `dir` attribute that changed. A component that was created and destroyed without being mounted, or mounted and destroyed within one task, stayed tracked for the life of the page, which was a leak; destroying a component now stops following its element, and that element no longer receives `mtrl-rtl` afterwards. The `mtrl-rtl` and `mtrl-ltr` classes are set as before.

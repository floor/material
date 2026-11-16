Section: Fixed

**Deferred menus cancel when an opener's ancestor becomes hidden.** A pending open no longer paints a late popup or moves focus after an ancestor becomes `display: none`, including across shadow roots. Making the opener visible again allows a fresh open.

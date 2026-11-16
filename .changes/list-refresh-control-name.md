Section: Fixed

**A rebuilt list row re-points its trailing control's name.** After `list.refresh()`, a switch, checkbox or radio the list named takes the rebuilt row's `aria-labelledby` and `aria-describedby` instead of keeping references to the removed text nodes, so the control stays named for assistive technology. A name the application set is still never replaced.

Section: Fixed

**Toolbars remain reachable when their tab-stop item is disabled.** Changes to native disabled state or `aria-disabled` move the tab stop to an enabled item without moving focus. This also works for slotted controls, and re-enabling an item restores a tab stop when all items were disabled.

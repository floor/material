Section: Fixed

**Menu inside a positioned host.** A menu is written in its offsetParent's space while a rect is in the viewport's, so with a positioned host away from the origin and no container the menu landed at the host's distance — 46.8 px off in right-to-left at zoom 1, and 370.7 px at 0.5. The placement subtracts the offsetParent's rect now, and the 16/48 px viewport clamps stay in viewport pixels, so the menu sits on its opener in any direction at any zoom.

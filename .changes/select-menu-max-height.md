Section: Fixed

**Select: the menu is no longer capped at 20rem.** A top-layer select menu that fit the window was still limited to 20rem, so a longer list scrolled inside that cap. The cap is gone. The menu still scrolls when it does not fit the window, with the same 48px margin. A short menu is unchanged (`Menu.kt` `MenuVerticalMargin`, material3 1.4.0).

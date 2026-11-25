Section: Fixed

**Slider pressed gap.** The track's gap is measured from the handle's edge, so a handle that narrows on a press (4 dp to 2 dp) brings each piece of track 1 px closer for as long as the press lasts, and they move back on the release. The pieces grow by that pixel as a painted edge on the side facing the handle, not as a new layout, so their settle spring for the value change is never restarted — the click that used to leave the pieces behind stays in step.

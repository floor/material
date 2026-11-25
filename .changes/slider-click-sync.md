Section: Fixed

**Slider click.** A click on the track keeps the handle and the track's two pieces in step while they settle. A press used to change the gap the pieces keep from the handle by a pixel, and the release re-laid them out one frame after the handle's spring had started; WebKit then ran the two transitions a few milliseconds apart to the end, so the pieces visibly left the handle — the active piece reaching past it or the inactive piece starting short. The gap now follows only a settled state (a focused handle), and a check samples every frame of the settle on Chromium and WebKit.

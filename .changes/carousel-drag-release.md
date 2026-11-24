Section: Fixed

**Carousel mouse drag.** Every way a drag stops now ends it: a context menu over a slide releases the pointer capture without a cancel event, a release outside the scroller never arrived, and the drag lived on — moving the mouse teleported the strip, the snap points stayed off and the next click was swallowed. A press no longer scrolls the carousel, links and buttons inside slides receive their clicks again, and the strip follows the pointer in both directions.

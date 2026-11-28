Section: Fixed

**Carousel keys inside a control.** A text input, a textarea, editable content or a select inside a slide keeps the arrow keys, Home and End: the carousel took them for navigation, cancelled the event and selected another slide, so the caret did not move. A control inside another element's shadow tree is recognised too. Navigation from the slide itself, and from a button or a checkbox inside it, is unchanged.

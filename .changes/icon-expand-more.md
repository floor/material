Section: Added

**The select field's dropdown and a filter chip's trailing menu can draw a registry glyph.** `setIcons({ "expand-more": … })` replaces both built-in triangles, captured when the component is created; `null`, `undefined` or the empty string restores the built-in. A chip's own `trailingIcon` still wins over the registry, as the other slots do.

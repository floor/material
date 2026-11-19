Section: Fixed

**A never-opened dialog or snackbar carries the same closed-state attributes as one that has closed.** The closed surface had `inert` from creation but only gained `aria-hidden="true"` through an open and a close, so a tool that reads the ARIA tree alone still saw a dialog's title and a snackbar's message and action before the first show. Creation now sets both attributes, opening removes both, and closing restores both, for the dialog and the snackbar, factory and element alike; a surface created open carries neither.

Section: Fixed

**`debounce` and `throttle` (`material/core/utils`).** `debounce` now waits for a quiet interval after the last call of a burst: it fired one `wait` after the first call, so two calls 80 ms apart with a 100 ms wait ran the callback at 100 ms where the documented behaviour is 180 ms, and a steady burst fired again and again. `maxWait` now bounds a burst as documented. The trailing call of `throttle` carries the arguments of the last call in its window, not of the call that started the timer. `leading`, `cancel` and the signatures are unchanged.

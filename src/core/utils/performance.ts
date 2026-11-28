export type Cancellable<F> = F & { cancel(): void };

// src/core/utils/performance.ts
/**
 * @module core/utils/performance
 * @description Performance utilities for optimizing high-frequency event handlers
 */

/**
 * Creates a throttled function that only invokes the provided function 
 * at most once per every specified wait milliseconds.
 *
 * Throttling ensures that the function executes at a regular interval,
 * which is useful for limiting the rate of execution for expensive operations.
 *
 * @param {Function} fn - The function to throttle
 * @param {number} wait - The number of milliseconds to throttle invocations to
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Specify invoking on the leading edge of the timeout (default: true)
 * @param {boolean} options.trailing - Specify invoking on the trailing edge of the timeout (default: true)
 * @returns {Function} The throttled function
 *
 * @example
 * // Throttle scroll handler to execute at most once every 100ms
 * const throttledScroll = throttle((e) => {
 *   updateScrollPosition(window.scrollY);
 * }, 100);
 * 
 * window.addEventListener('scroll', throttledScroll);
 */
export const throttle = <T extends (...args: never[]) => unknown>(
  fn: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): Cancellable<(...args: Parameters<T>) => void> => {
  let timeout: number | null = null;
  let previous = 0;
  // The call the trailing edge makes: the last one of the window, not the
  // one that started the timer.
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  const { leading = true, trailing = true } = options;

  const throttled = function(this: unknown, ...args: Parameters<T>): void {
    const now = Date.now();

    if (!previous && !leading) {
      previous = now;
    }

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      previous = now;
      lastArgs = lastThis = null;
      fn.apply(this, args);
    } else if (trailing) {
      lastArgs = args;
      lastThis = this;
      if (!timeout) {
        timeout = window.setTimeout(() => {
          const pendingArgs = lastArgs as Parameters<T>;
          const pendingThis = lastThis;
          previous = leading ? Date.now() : 0;
          timeout = null;
          lastArgs = lastThis = null;
          fn.apply(pendingThis, pendingArgs);
        }, remaining);
      }
    }
  };
  return Object.assign(throttled, { cancel() {
    if (timeout !== null) clearTimeout(timeout);
    timeout = null;
    previous = 0;
    lastArgs = lastThis = null;
  } });
};

/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait milliseconds have elapsed since the last time 
 * it was invoked.
 *
 * Debouncing groups multiple sequential calls into a single execution at the end,
 * which is useful for handling rapid-fire events like resize or input.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @param {Object} options - Configuration options
 * @param {boolean} options.leading - Specify invoking on the leading edge of the timeout (default: false)
 * @param {number} options.maxWait - Maximum time function can be delayed before execution in milliseconds
 * @returns {Function} The debounced function
 *
 * @example
 * // Debounced search that executes 300ms after the user stops typing
 * const debouncedSearch = debounce((query) => {
 *   performSearch(query);
 * }, 300);
 * 
 * searchInput.addEventListener('input', (e) => {
 *   debouncedSearch(e.target.value);
 * });
 */
export const debounce = <T extends (...args: never[]) => unknown>(
  fn: T,
  wait: number,
  options: { leading?: boolean; maxWait?: number } = {}
): Cancellable<(...args: Parameters<T>) => void> => {
  let timeout: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;

  const { leading = false, maxWait } = options;

  // Whether the wait is over at `time`: no call is pending a quiet interval,
  // the interval since the last call has passed (or the clock went back), or
  // the calls have held the function back for maxWait.
  const shouldInvoke = (time: number): boolean => {
    if (lastCallTime === null) return true;
    const timeSinceLastCall = time - lastCallTime;

    return (
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && time - lastInvokeTime >= maxWait)
    );
  };

  // How long the timer still has to run at `time`: what is left of the quiet
  // interval after the last call, bounded by what is left of maxWait.
  const remainingWait = (time: number): number => {
    const quiet = wait - (time - (lastCallTime as number));
    return maxWait === undefined ? quiet : Math.min(quiet, maxWait - (time - lastInvokeTime));
  };

  const invokeFunc = (time: number): void => {
    const args = lastArgs as Parameters<T>;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastInvokeTime = time;
    fn.apply(thisArg, args);
  };

  // The timer measures from the call that started it. A call that came since
  // moved the end of the quiet interval, so the timer runs on for what is
  // left of it; before, it fired here, a wait after the first call of a burst.
  const timerExpired = (): void => {
    const time = Date.now();
    if (!shouldInvoke(time)) {
      timeout = window.setTimeout(timerExpired, remainingWait(time));
      return;
    }
    timeout = null;
    // Only if a call came since the last invocation: a leading call alone
    // is not made twice.
    if (lastArgs) invokeFunc(time);
  };

  const debounced = function(this: unknown, ...args: Parameters<T>): void {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        // The first call of a burst: the wait starts here.
        lastInvokeTime = time;
        timeout = window.setTimeout(timerExpired, wait);
        if (leading) invokeFunc(time);
        return;
      }
      if (maxWait !== undefined) {
        // maxWait ran out while the timer was still pending.
        window.clearTimeout(timeout);
        timeout = window.setTimeout(timerExpired, wait);
        invokeFunc(time);
        return;
      }
    }

    if (timeout === null) {
      timeout = window.setTimeout(timerExpired, wait);
    }
  };
  return Object.assign(debounced, { cancel() {
    if (timeout !== null) window.clearTimeout(timeout);
    timeout = null;
    lastArgs = lastThis = lastCallTime = null;
    lastInvokeTime = 0;
  } });
};

/**
 * Creates a function that is restricted to invoking the provided function once.
 * Repeat calls to the function return the value of the first invocation.
 * 
 * @param {Function} fn - The function to restrict
 * @returns {Function} The restricted function
 * 
 * @example
 * // Initialize app only once
 * const initApp = once(() => {
 *   console.log('App initialized');
 *   setupEventListeners();
 *   loadInitialData();
 * });
 * 
 * // Can be called multiple times, but executes only once
 * button1.addEventListener('click', initApp);
 * button2.addEventListener('click', initApp);
 */
export const once = <T extends (...args: never[]) => unknown>(
  fn: T
): ((...args: Parameters<T>) => ReturnType<T>) => {
  let called = false;
  let result: ReturnType<T>;
  
  return function(this: unknown, ...args: Parameters<T>): ReturnType<T> {
    if (!called) {
      called = true;
      // `fn` is `T`, so this genuinely returns `ReturnType<T>`; TypeScript
      // cannot prove it through the generic once strictBindCallApply types
      // `apply` precisely, and widens to unknown.
      result = fn.apply(this, args) as ReturnType<T>;
    }
    
    return result;
  };
};
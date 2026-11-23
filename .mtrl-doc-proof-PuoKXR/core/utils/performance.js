export const throttle = (fn, wait, options = {}) => {
    let timeout = null;
    let previous = 0;
    const { leading = true, trailing = true } = options;
    const throttled = function (...args) {
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
            fn.apply(this, args);
        }
        else if (!timeout && trailing) {
            timeout = window.setTimeout(() => {
                previous = leading ? Date.now() : 0;
                timeout = null;
                fn.apply(this, args);
            }, remaining);
        }
    };
    return Object.assign(throttled, { cancel() {
            if (timeout !== null)
                clearTimeout(timeout);
            timeout = null;
            previous = 0;
        } });
};
export const debounce = (fn, wait, options = {}) => {
    let timeout = null;
    let lastArgs = null;
    let lastThis = null;
    let result;
    let lastCallTime = null;
    let lastInvokeTime = 0;
    const { leading = false, maxWait } = options;
    const shouldInvoke = (time) => {
        const timeSinceLastCall = time - (lastCallTime || 0);
        const timeSinceLastInvoke = time - lastInvokeTime;
        return (!lastCallTime ||
            timeSinceLastCall >= wait ||
            timeSinceLastCall < 0 ||
            (maxWait !== undefined && timeSinceLastInvoke >= maxWait));
    };
    const invokeFunc = (time) => {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = lastThis = null;
        lastInvokeTime = time;
        result = fn.apply(thisArg, args);
        return result;
    };
    const trailingEdge = (time) => {
        timeout = null;
        if (lastArgs) {
            return invokeFunc(time);
        }
        return result;
    };
    const leadingEdge = (time) => {
        lastInvokeTime = time;
        timeout = window.setTimeout(() => {
            trailingEdge(Date.now());
        }, wait);
        return leading ? invokeFunc(time) : result;
    };
    const debounced = function (...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);
        lastArgs = args;
        lastThis = this;
        lastCallTime = time;
        if (isInvoking) {
            if (timeout === null) {
                return leadingEdge(time);
            }
            if (maxWait !== undefined) {
                window.clearTimeout(timeout);
                timeout = window.setTimeout(() => {
                    const timeNow = Date.now();
                    if (shouldInvoke(timeNow)) {
                        return trailingEdge(timeNow);
                    }
                }, Math.min(wait, maxWait - (time - lastInvokeTime)));
            }
        }
        if (timeout === null) {
            timeout = window.setTimeout(() => {
                trailingEdge(Date.now());
            }, wait);
        }
        return result;
    };
    return Object.assign(debounced, { cancel() {
            if (timeout !== null)
                window.clearTimeout(timeout);
            timeout = null;
            lastArgs = lastThis = lastCallTime = null;
            lastInvokeTime = 0;
        } });
};
export const once = (fn) => {
    let called = false;
    let result;
    return function (...args) {
        if (!called) {
            called = true;
            result = fn.apply(this, args);
        }
        return result;
    };
};

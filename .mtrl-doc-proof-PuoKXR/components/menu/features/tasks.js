export const createMenuTasks = () => {
    const timers = new Set();
    const frames = new Set();
    let destroyed = false;
    const clear = (timer) => {
        if (timer === null)
            return;
        clearTimeout(timer);
        timers.delete(timer);
    };
    const cancelAll = () => {
        timers.forEach(clearTimeout);
        timers.clear();
        frames.forEach((frame) => window.cancelAnimationFrame(frame));
        frames.clear();
    };
    return {
        get destroyed() { return destroyed; },
        setTimeout(callback, delay) {
            if (destroyed)
                return null;
            const timer = setTimeout(() => {
                timers.delete(timer);
                if (!destroyed)
                    callback();
            }, delay);
            timers.add(timer);
            return timer;
        },
        clearTimeout: clear,
        requestAnimationFrame(callback) {
            if (destroyed)
                return;
            const frame = window.requestAnimationFrame((time) => {
                frames.delete(frame);
                if (!destroyed)
                    callback(time);
            });
            frames.add(frame);
        },
        cancelAll,
        destroy() {
            destroyed = true;
            cancelAll();
        },
    };
};

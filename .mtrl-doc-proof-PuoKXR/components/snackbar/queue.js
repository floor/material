import { SNACKBAR_DEFAULTS, SNACKBAR_QUEUE_BEHAVIORS } from "./constants.js";
export const createSnackbarQueue = (gap = SNACKBAR_DEFAULTS.QUEUE_GAP) => {
    const pending = [];
    let current = null;
    let currentDismiss = null;
    let advanceTimer = null;
    const clearAdvanceTimer = () => {
        if (advanceTimer !== null) {
            clearTimeout(advanceTimer);
            advanceTimer = null;
        }
    };
    const releaseCurrent = () => {
        if (current && currentDismiss) {
            current.off?.('dismiss', currentDismiss);
        }
        current = null;
        currentDismiss = null;
    };
    const evictCurrent = () => {
        const active = current;
        releaseCurrent();
        try {
            active?._hide?.();
        }
        catch {
        }
    };
    const dropPending = () => {
        for (const snackbar of pending.splice(0))
            snackbar._hide?.();
    };
    const showNext = () => {
        clearAdvanceTimer();
        if (current || pending.length === 0)
            return;
        const snackbar = pending.shift();
        current = snackbar;
        const handleDismiss = () => {
            releaseCurrent();
            if (pending.length > 0) {
                advanceTimer = setTimeout(() => {
                    advanceTimer = null;
                    showNext();
                }, gap);
            }
        };
        currentDismiss = handleDismiss;
        snackbar.on?.('dismiss', handleDismiss);
        snackbar._show();
    };
    return {
        add(snackbar, options = {}) {
            if (!snackbar._show) {
                throw new Error('Snackbar must implement _show method');
            }
            const behavior = options.behavior ?? SNACKBAR_QUEUE_BEHAVIORS.QUEUE;
            if (current && current.element && !current.element.isConnected) {
                releaseCurrent();
            }
            if (behavior === SNACKBAR_QUEUE_BEHAVIORS.REPLACE) {
                dropPending();
                clearAdvanceTimer();
                evictCurrent();
                pending.push(snackbar);
                showNext();
                return;
            }
            pending.push(snackbar);
            if (!current) {
                showNext();
            }
        },
        clear() {
            dropPending();
            clearAdvanceTimer();
            evictCurrent();
        },
        remove(snackbar) {
            if (snackbar === current) {
                currentDismiss?.();
                return;
            }
            const index = pending.indexOf(snackbar);
            if (index >= 0)
                pending.splice(index, 1);
        },
        getLength() {
            return pending.length + (current ? 1 : 0);
        }
    };
};

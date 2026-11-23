export const observeCanvasResize = (element, canvas, onResize) => {
    let timeoutId = null;
    const debouncedResize = () => {
        if (timeoutId)
            clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            onResize();
        }, 100);
    };
    const view = canvas ? element.ownerDocument?.defaultView ?? null : null;
    let resolution = null;
    function onResolutionChange() {
        resolution?.removeEventListener("change", onResolutionChange);
        armResolution();
        debouncedResize();
    }
    function armResolution() {
        if (!view?.matchMedia)
            return;
        resolution = view.matchMedia(`(resolution: ${view.devicePixelRatio || 1}dppx)`);
        resolution.addEventListener("change", onResolutionChange);
    }
    armResolution();
    let stopWidth;
    if (typeof ResizeObserver !== 'undefined') {
        let seen = -1;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                if (Math.abs(width - seen) > 2) {
                    seen = width;
                    debouncedResize();
                }
            }
        });
        observer.observe(element);
        stopWidth = () => observer.disconnect();
    }
    else {
        window.addEventListener('resize', debouncedResize);
        stopWidth = () => window.removeEventListener('resize', debouncedResize);
    }
    return () => {
        if (timeoutId)
            clearTimeout(timeoutId);
        resolution?.removeEventListener("change", onResolutionChange);
        stopWidth();
    };
};

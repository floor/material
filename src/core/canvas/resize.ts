/**
 * Canvas resize utilities
 * Provides utilities for observing and handling canvas resize events
 */

/**
 * Observes an element for the two things that change a canvas backing store:
 * its width, and the devicePixelRatio. A ratio change (browser zoom, or a
 * window moved between a 1x display and a Retina one) keeps the element's CSS
 * width while the canvas needs twice the physical pixels, so it repaints like
 * a width change would.
 *
 * @param element - The element to observe for size changes
 * @param canvas - The canvas element; without one there is nothing to size, and nothing is watched
 * @param onResize - Callback to execute when the element resizes or the ratio changes
 * @returns Cleanup function to stop observing
 */
export const observeCanvasResize = (
  element: HTMLElement,
  canvas: HTMLCanvasElement | null | undefined,
  onResize: () => void
): (() => void) => {

  let timeoutId: number | null = null;

  // Debounced resize handler
  const debouncedResize = (): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      onResize();
    }, 100);
  };

  // A resolution media query matches at the ratio it names, so each change
  // unmatches it; it is re-armed at the ratio the document has now. The
  // callback runs the same debounced repaint a width change runs.
  const view = canvas ? element.ownerDocument?.defaultView ?? null : null;
  let resolution: MediaQueryList | null = null;
  function onResolutionChange(): void {
    resolution?.removeEventListener("change", onResolutionChange);
    armResolution();
    debouncedResize();
  }
  function armResolution(): void {
    if (!view?.matchMedia) return;
    resolution = view.matchMedia(`(resolution: ${view.devicePixelRatio || 1}dppx)`);
    resolution.addEventListener("change", onResolutionChange);
  }
  armResolution();

  let stopWidth: () => void;

  // Use ResizeObserver if available
  if (typeof ResizeObserver !== 'undefined') {
    // canvas.style.width may be a percentage, so remember the last box.
    // seen starts at -1 so the first real width draws: construction may have
    // measured nothing.
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

    // Observe the specified element
    observer.observe(element);
    stopWidth = () => observer.disconnect();
  } else {
    // Fallback to window resize
    window.addEventListener('resize', debouncedResize);
    stopWidth = () => window.removeEventListener('resize', debouncedResize);
  }

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    resolution?.removeEventListener("change", onResolutionChange);
    stopWidth();
  };
};

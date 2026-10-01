/**
 * Canvas resize utilities
 * Provides utilities for observing and handling canvas resize events
 */

/**
 * Observes resize events on an element and triggers a callback
 * Watches the specified element and debounces resize events
 * 
 * @param element - The element to observe for size changes
 * @param canvas - The canvas element (for context)
 * @param onResize - Callback to execute when the element resizes
 * @returns Cleanup function to stop observing
 */
export const observeCanvasResize = (
  element: HTMLElement,
  _canvas: HTMLCanvasElement,
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
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      observer.disconnect();
    };
  } else {
    // Fallback to window resize
    window.addEventListener('resize', debouncedResize);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
    };
  }
}; 
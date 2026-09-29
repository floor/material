// src/components/slider/features/handlers.ts
import { SLIDER_EVENTS } from "../types";
import { arrowSign, getAxis, isRtl } from "./axis";
import {
  SliderConfig,
  SliderEventHelpers,
  SliderState,
  SliderPointerEvent,
  SliderUiRenderer,
} from "../types";

/**
 * Create consolidated event handlers for slider component (mouse, touch, keyboard)
 *
 * @param config Slider configuration
 * @param state Slider state object
 * @param uiRenderer UI renderer interface from controller
 * @param eventHelpers Event helper methods
 * @returns Event handlers for all slider interactions
 */
/**
 * The x or y coordinate of whichever kind of pointer event this is.
 *
 * `"touches" in e` is a real type guard where `e.type.includes("touch")` is
 * only a string test, so the branches below could not be narrowed. Every
 * caller is a down or a move, where the touch list is non-empty.
 */
const clientXOf = (e: SliderPointerEvent): number =>
  "touches" in e ? e.touches[0].clientX : e.clientX;
const clientYOf = (e: SliderPointerEvent): number =>
  "touches" in e ? e.touches[0].clientY : e.clientY;

export const createHandlers = (
  config: SliderConfig,
  state: SliderState,
  uiRenderer: Partial<SliderUiRenderer>,
  eventHelpers: SliderEventHelpers,
) => {
  // Get required elements from structure (with fallbacks)
  // Check both direct component properties (from withDom) and components object (legacy)
  // `|| {}` on the component was dead -- the controller always sets it -- and
  // the empty object made every lookup below a union no property existed on.
  const components = state.component.components || {};
  const component = state.component;
  // The coordinate along the slider's axis: y for a vertical slider. FLO-252.
  const pointerOf = config.orientation === "vertical" ? clientYOf : clientXOf;
  // The values a handle may take: a range handle stops at the other one.
  const rangeBounds = (isSecondHandle: boolean): [number, number] => {
    if (!config.range || state.secondValue === null) return [state.min, state.max];
    return isSecondHandle ? [state.value, state.max] : [state.min, state.secondValue];
  };

  // Extract needed components from both locations for backward compatibility
  const container = component.container || components.container || null;
  const handle = component.handle || components.handle || null;
  const valueBubble = component.valueBubble || components.valueBubble || null;
  const secondHandle =
    component.secondHandle || components.secondHandle || null;
  const secondValueBubble =
    component.secondValueBubble || components.secondValueBubble || null;

  // Get required helper methods (with fallbacks)
  const {
    getValueFromPosition = () => 0,
    roundToStep = (value: number) => value,
    clamp = (value: number) => value,
    showValueBubble = () => {},
    render = () => {},
  } = uiRenderer;

  const { triggerEvent = () => ({ defaultPrevented: false }) } = eventHelpers;

  // Track whether a real drag has started
  let hasActualDragStarted = false;
  let initialX = 0;
  const DRAG_THRESHOLD = 3;

  // Last focused handle tracker for keyboard navigation
  let lastFocusedHandle: HTMLElement | null = null;

  // Bubble management
  const clearBubbleHideTimer = () => {
    if (state.valueHideTimer) {
      clearTimeout(state.valueHideTimer);
      state.valueHideTimer = null;
    }
  };

  const hideAllBubbles = () => {
    clearBubbleHideTimer();
    if (valueBubble) showValueBubble(valueBubble, false);
    if (secondValueBubble) showValueBubble(secondValueBubble, false);
  };

  const showActiveBubble = (bubble: HTMLElement | null) => {
    hideAllBubbles();
    if (bubble && config.showValue) showValueBubble(bubble, true);
  };

  const hideActiveBubble = (bubble: HTMLElement | null, delay = 0) => {
    clearBubbleHideTimer();
    if (!bubble || !config.showValue) return;

    // A timer by design: the value label lingers after a release or a blur so
    // it can still be read. Cleared on the next show and on destroy.
    if (delay > 0) {
      state.valueHideTimer = setTimeout(() => {
        showValueBubble(bubble, false);
      }, delay);
    } else {
      showValueBubble(bubble, false);
    }
  };

  // Focus management
  const clearKeyboardFocus = () => {
    // Clear local focus indicators
    if (handle)
      handle.classList.remove(
        `${state.component.getClass("slider__handle")}--focused`,
      );
    if (secondHandle)
      secondHandle.classList.remove(
        `${state.component.getClass("slider__handle")}--focused`,
      );

    // Clear any focus indicator this slider still carries.
    //
    // This used to sweep the whole document, which stripped the focus ring
    // from every other slider on the page: touching one slider made a keyboard
    // user lose the indicator telling them where they were in another. It is
    // also redundant for this slider's own handles, which the two lines above
    // already clear.
    try {
      const focusClass = state.component.getClass("slider__handle--focused");
      state.component.element
        .querySelectorAll(`.${focusClass}`)
        .forEach((el: Element) => {
          el.classList.remove(focusClass);
        });

      // Only blur a handle belonging to this slider. Blurring on the strength
      // of a class name alone took focus off another component's handle.
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        state.component.element.contains(active) &&
        active.classList.contains(state.component.getClass("slider__handle"))
      ) {
        active.blur();
      }
    } catch (error) {
      console.warn("Error clearing keyboard focus:", error);
    }
  };

  /**
   * Handle mouse/touch down on a handle
   */
  const handleHandleMouseDown = (
    e: SliderPointerEvent,
    isSecondHandle = false,
  ) => {
    // Check if disabled
    if (
      !state.component ||
      (state.component.disabled && state.component.disabled.isDisabled())
    ) {
      return;
    }

    // Only preventDefault for mouse events to allow passive touchstart
    if (e.type === "mousedown") {
      e.preventDefault();
    }
    e.stopPropagation();

    hideAllBubbles();
    clearKeyboardFocus();

    // Capture initial position
    initialX = pointerOf(e);

    // Setup drag state
    state.dragging = false;
    state.pressed = true; // Set pressed state immediately
    hasActualDragStarted = false;
    state.activeHandle = isSecondHandle ? "second" : "first"; // Track which handle
    state.activeBubble = isSecondHandle ? secondValueBubble : valueBubble;

    // Show bubble immediately
    showActiveBubble(state.activeBubble);

    // Add global event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleMouseMove, { passive: false });
    document.addEventListener("touchend", handleMouseUp);

    render();
    triggerEvent(SLIDER_EVENTS.START, e);
  };

  /**
   * Handle mouse/touch down on the track
   */
  const handleTrackMouseDown = (e: SliderPointerEvent) => {
    // Check if disabled
    if (
      !state.component ||
      (state.component.disabled && state.component.disabled.isDisabled()) ||
      !container
    ) {
      return;
    }

    // Only preventDefault for mouse events to allow passive touchstart
    if (e.type === "mousedown") {
      e.preventDefault();
    }
    hideAllBubbles();
    clearKeyboardFocus();

    // Determine which handle to move
    let isSecondHandle = false;

    try {
      const position = pointerOf(e);

      // Calculate value at click position and apply constraints
      let newValue = getValueFromPosition(position);
      if (config.snapToSteps && state.step > 0)
        newValue = roundToStep(newValue);
      newValue = clamp(newValue, state.min, state.max);

      if (config.range && state.secondValue !== null) {
        // For range slider, move the closest handle
        const distToFirst = Math.abs(newValue - state.value);
        const distToSecond = Math.abs(newValue - state.secondValue);

        isSecondHandle = distToSecond < distToFirst;
        isSecondHandle
          ? (state.secondValue = newValue)
          : (state.value = newValue);
      } else {
        // Single handle slider - use setValue API for centered sliders to ensure animation
        if (
          config.centered &&
          state.component.slider &&
          state.component.slider.setValue
        ) {
          // Use the API method which handles previousValue tracking and animation
          state.component.slider.setValue(newValue, false); // false to not trigger event yet
        } else {
          // Regular slider - direct update
          state.value = newValue;
        }
      }

      // Update UI and trigger events
      render();
      triggerEvent(SLIDER_EVENTS.INPUT, e);
    } catch (error) {
      console.warn("Error handling track click:", error);
    }

    // Set active elements
    state.activeHandle = isSecondHandle ? "second" : "first";
    state.activeBubble = isSecondHandle ? secondValueBubble : valueBubble;

    // Store the initial position
    initialX = pointerOf(e);

    // For centered sliders, delay starting drag to allow animation
    if (config.centered && !config.range) {
      // Show bubble
      showActiveBubble(state.activeBubble);

      // Add event listeners but don't start dragging yet
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleMouseUp);

      // Don't set pressed state for track clicks
      state.pressed = false;

      triggerEvent(SLIDER_EVENTS.START, e);
    } else {
      // For non-centered sliders, start drag but don't set pressed since it's a track click
      state.dragging = false;
      state.pressed = false; // Don't set pressed for track clicks
      hasActualDragStarted = false;

      // Show bubble
      showActiveBubble(state.activeBubble);

      // Add event listeners
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleMouseUp);

      render();
      triggerEvent(SLIDER_EVENTS.START, e);
    }
  };

  /**
   * Handle mouse/touch move during drag
   */
  const handleMouseMove = (e: SliderPointerEvent) => {
    if (!state.activeHandle || !container) return;
    e.preventDefault();

    try {
      // Get current position
      const currentX = pointerOf(e);

      // Determine if we've started a real drag
      if (
        !hasActualDragStarted &&
        Math.abs(currentX - initialX) >= DRAG_THRESHOLD
      ) {
        hasActualDragStarted = true;
        state.dragging = true;
        state.component.element.classList.add(
          `${state.component.getClass("slider")}--dragging`,
        );
      }

      // Calculate new value and apply constraints
      let newValue = getValueFromPosition(currentX);
      if (config.snapToSteps && state.step > 0)
        newValue = roundToStep(newValue);
      newValue = clamp(newValue, state.min, state.max);

      // A range handle stops at the other one rather than crossing it (Compose's
      // RangeSlider coerces each value to the other). The handles used to swap
      // roles mid-drag. FLO-251.
      const isSecondHandle = state.activeHandle === "second";

      if (config.range && state.secondValue !== null) {
        const [low, high] = rangeBounds(isSecondHandle);
        const clamped = Math.min(high, Math.max(low, newValue));
        if (isSecondHandle) state.secondValue = clamped;
        else state.value = clamped;
      } else {
        // Regular slider - update previousValue for centered sliders
        if (config.centered) {
          state.previousValue = state.value;
        }
        state.value = newValue;
      }

      render();
      triggerEvent(SLIDER_EVENTS.INPUT, e);
    } catch (error) {
      console.warn("Error during slider drag:", error);
    }
  };

  /**
   * Handle mouse/touch up after drag
   */
  const handleMouseUp = (e: SliderPointerEvent) => {
    if (!state.activeHandle) return;
    e.preventDefault();

    // Reset drag states
    state.dragging = false;
    state.pressed = false; // Clear pressed state
    hasActualDragStarted = false;
    state.component.element.classList.remove(
      `${state.component.getClass("slider")}--dragging`,
    );

    // Hide bubble with delay
    hideActiveBubble(state.activeBubble, 1000);

    // Remove global event listeners
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("touchmove", handleMouseMove);
    document.removeEventListener("touchend", handleMouseUp);

    // Reset active handle and update UI
    state.activeHandle = null;
    render();

    // Trigger events
    triggerEvent(SLIDER_EVENTS.CHANGE, e);
    triggerEvent(SLIDER_EVENTS.END, e);
  };

  /**
   * Handle keyboard input
   */
  const handleKeyDown = (e: KeyboardEvent, isSecondHandle = false) => {
    if (state.component.disabled && state.component.disabled.isDisabled())
      return;

    const step = state.step || 1;
    let newValue = isSecondHandle ? state.secondValue : state.value;
    // `range: true` with no `secondValue` gives a second handle and a null
    // second value. There is nothing to move, and arithmetic on null would
    // have produced a value out of nowhere.
    if (newValue === null) return;
    const stepSize = e.shiftKey ? step * 10 : step;

    // Handle tab key separately
    if (e.key === "Tab") return;

    // Along the track the arrows follow it as drawn (reversed in RTL, and on a
    // top-to-bottom vertical slider); across it they keep ARIA's meaning. PageUp and
    // PageDown move a tenth of the steps, one to ten of them (Compose's
    // `(steps + 1) / 10`, coerced to 1..10), raising on a horizontal slider and
    // following the track on a vertical one. FLO-251.
    const axis = getAxis(config, isRtl(state.component.element));
    const sign = arrowSign(axis);
    const intervals = Math.max(1, Math.floor((state.max - state.min) / step));
    const page = Math.min(10, Math.max(1, Math.floor(intervals / 10))) * step;
    const along = axis.vertical ? ["ArrowUp", "ArrowDown"] : ["ArrowRight", "ArrowLeft"];
    let target: number;
    if (e.key === along[0]) target = newValue + sign * stepSize;
    else if (e.key === along[1]) target = newValue - sign * stepSize;
    else if (e.key === "ArrowUp" || e.key === "ArrowRight") target = newValue + stepSize;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") target = newValue - stepSize;
    else if (e.key === "PageUp") target = newValue + (axis.vertical ? sign : 1) * page;
    else if (e.key === "PageDown") target = newValue - (axis.vertical ? sign : 1) * page;
    else if (e.key === "Home") target = state.min;
    else if (e.key === "End") target = state.max;
    else return; // Exit if not a handled key
    e.preventDefault();
    // A range handle stops at the other one, as Compose's RangeSlider coerces it.
    const [low, high] = rangeBounds(isSecondHandle);
    newValue = Math.min(high, Math.max(low, target));


    // Update active bubble reference
    state.activeBubble = isSecondHandle ? secondValueBubble : valueBubble;

    // Show value bubble during keyboard interaction
    showActiveBubble(state.activeBubble);

    // Update the value
    if (isSecondHandle) {
      state.secondValue = newValue;
    } else {
      // Track previousValue for centered sliders
      if (config.centered) {
        state.previousValue = state.value;
      }
      state.value = newValue;
    }

    // Update UI and trigger events
    render();
    triggerEvent(SLIDER_EVENTS.INPUT, e);
    triggerEvent(SLIDER_EVENTS.CHANGE, e);
  };

  /**
   * Handle focus events
   */
  const handleFocus = (e: FocusEvent, isSecondHandle = false) => {
    if (state.component.disabled && state.component.disabled.isDisabled())
      return;

    // Track the currently focused handle
    const currentHandle = isSecondHandle ? secondHandle : handle;

    // Hide previous bubble if switching between handles
    if (lastFocusedHandle && lastFocusedHandle !== currentHandle) {
      hideAllBubbles();
    }

    if (!currentHandle) return;
    lastFocusedHandle = currentHandle;

    // Add focus class and show bubble
    currentHandle.classList.add(
      `${state.component.getClass("slider__handle")}--focused`,
    );
    showActiveBubble(isSecondHandle ? secondValueBubble : valueBubble);
    state.activeBubble = isSecondHandle ? secondValueBubble : valueBubble;
    // A focused handle narrows to 2dp and the track's gap follows it.
    render();

    triggerEvent(SLIDER_EVENTS.FOCUS, e);
  };

  /**
   * Handle blur events
   */
  const handleBlur = (e: FocusEvent, isSecondHandle = false) => {
    const handleElement = isSecondHandle ? secondHandle : handle;
    if (!handleElement) return;
    handleElement.classList.remove(
      `${state.component.getClass("slider__handle")}--focused`,
    );
    render();

    // Only hide bubble if not tabbing to another handle
    const relatedTarget = e.relatedTarget;
    const otherHandle = isSecondHandle ? handle : secondHandle;

    if (!relatedTarget || relatedTarget !== otherHandle) {
      hideActiveBubble(isSecondHandle ? secondValueBubble : valueBubble, 200);
    }

    triggerEvent(SLIDER_EVENTS.BLUR, e);
  };

  /**
   * Set up all event listeners
   */
  // Each handle's listeners, made once and kept, so cleanup removes the very
  // functions setup added. Both used to be written inline, and removeEventListener
  // matches by reference, so no handle listener was ever removed: after destroy a
  // key still moved the value and focus still showed the bubble. FLO-253.
  const listenersFor = (isSecondHandle: boolean) => ({
    press: (e: SliderPointerEvent) => handleHandleMouseDown(e, isSecondHandle),
    keydown: (e: KeyboardEvent) => handleKeyDown(e, isSecondHandle),
    focus: (e: FocusEvent) => handleFocus(e, isSecondHandle),
    blur: (e: FocusEvent) => handleBlur(e, isSecondHandle),
  });
  const handleListeners = listenersFor(false);
  const secondHandleListeners = listenersFor(true);
  const attach = (element: HTMLElement, listeners: ReturnType<typeof listenersFor>) => {
    element.addEventListener("mousedown", listeners.press);
    element.addEventListener("touchstart", listeners.press, { passive: true });
    element.addEventListener("keydown", listeners.keydown);
    element.addEventListener("focus", listeners.focus);
    element.addEventListener("blur", listeners.blur);
  };
  const detach = (element: HTMLElement, listeners: ReturnType<typeof listenersFor>) => {
    element.removeEventListener("mousedown", listeners.press);
    element.removeEventListener("touchstart", listeners.press);
    element.removeEventListener("keydown", listeners.keydown);
    element.removeEventListener("focus", listeners.focus);
    element.removeEventListener("blur", listeners.blur);
  };

  const setupEventListeners = () => {
    if (!handle || !container) {
      console.warn(
        "Cannot set up event listeners: missing container or handle",
      );
      return;
    }

    // Use container for track events instead of track for better UX
    container.addEventListener("mousedown", handleTrackMouseDown);
    container.addEventListener("touchstart", handleTrackMouseDown, {
      passive: true,
    });

    attach(handle, handleListeners);
    if (config.range && secondHandle) attach(secondHandle, secondHandleListeners);
  };

  const cleanupEventListeners = () => {
    if (!state.component) return;

    // Clean up container listeners
    if (container) {
      container.removeEventListener("mousedown", handleTrackMouseDown);
      container.removeEventListener("touchstart", handleTrackMouseDown);
    }

    if (handle) detach(handle, handleListeners);
    if (config.range && secondHandle) detach(secondHandle, secondHandleListeners);

    // Clean up document listeners
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("touchmove", handleMouseMove);
    document.removeEventListener("touchend", handleMouseUp);
  };

  // Return consolidated handlers
  return {
    // Mouse/Touch handlers
    handleHandleMouseDown,
    handleTrackMouseDown,
    handleMouseMove,
    handleMouseUp,

    // Keyboard handlers
    handleKeyDown,
    handleFocus,
    handleBlur,

    // Event management
    setupEventListeners,
    cleanupEventListeners,

    // Bubble management
    showActiveBubble,
    hideActiveBubble,
    hideAllBubbles,
    clearKeyboardFocus,
  };
};

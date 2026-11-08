// src/components/bottom-sheet/features/state.ts

import { BottomSheetConfig, BottomSheetState } from "../types";
import {
  BOTTOM_SHEET_CLASSES,
  BOTTOM_SHEET_EVENTS,
  BOTTOM_SHEET_STATES,
  BOTTOM_SHEET_VARIANTS,
} from "../constants";
import { deepActiveElement, wrapTab } from "../../../core/dom/focus";
import {
  hideFromTopLayer,
  inertOutside,
  onModalEscape,
  onTopLayerClose,
  showInTopLayer,
  type ModalEscape,
} from "../../../core/dom/layer";

interface StateComponent {
  element: HTMLElement;
  getClass: (name: string) => string;
  emit: (event: string, data?: unknown) => unknown;
  structure: {
    scrim: HTMLElement | null;
    container: HTMLElement;
  };
}

/**
 * Opening, closing and the two open heights.
 *
 * Events go through `component.emit`, which is what the composed events
 * enhancer provides. Reaching for `component.events.emit` throws, because that
 * shape comes from a different enhancer the barrel exports under another name.
 */
export const withState =
  (config: BottomSheetConfig) =>
  <C extends StateComponent>(component: C) => {
    const { element, getClass, structure } = component;
    const root = getClass(BOTTOM_SHEET_CLASSES.ROOT);
    const isModal = config.variant === BOTTOM_SHEET_VARIANTS.MODAL;
    // A modal sheet whose root is a <dialog> shown with showModal()
    const top = config.layer === "top";

    let state: BottomSheetState =
      config.initialState ?? BOTTOM_SHEET_STATES.HIDDEN;
    /** What had focus before a modal sheet took it */
    let previouslyFocused: HTMLElement | null = null;
    /** Undoes the inert page of a modal sheet outside the top layer */
    let restorePage: (() => void) | undefined;
    let escape: ModalEscape | undefined;

    // A modal sheet's place among the open modals, while it is open: Escape
    // is a key press handled there, for the topmost one, in both layers
    const onStack = (on: boolean): void => {
      escape?.stop();
      escape =
        on && isModal
          ? onModalEscape(element, () => {
              if (config.closeOnEscape) close();
            })
          : undefined;
    };

    // A modal sheet outside the top layer does what showModal() does for one
    // inside it: the page goes inert and Tab stays in the sheet.
    const trap = (on: boolean): void => {
      onStack(on);
      if (!isModal || top) return;
      restorePage?.();
      restorePage = on ? inertOutside(element) : undefined;
      if (on) element.addEventListener("keydown", handleTab);
      else element.removeEventListener("keydown", handleTab);
    };

    const applyState = (next: BottomSheetState): void => {
      for (const name of Object.values(BOTTOM_SHEET_STATES)) {
        element.classList.toggle(`${root}--${name}`, name === next);
      }
      const open = next !== BOTTOM_SHEET_STATES.HIDDEN;
      element.setAttribute("aria-hidden", open ? "false" : "true");
      // a closed sheet must not be reachable by keyboard behind the page
      element.style.pointerEvents = open ? "" : "none";
    };

    const setState = (next: BottomSheetState): void => {
      if (next === state) return;
      const previous = state;
      state = next;
      applyState(next);
      component.emit(BOTTOM_SHEET_EVENTS.STATE_CHANGE, { state: next, previous });
    };

    const handleKeydown = (event: KeyboardEvent): void => {
      if (
        event.key !== "Escape" ||
        state === BOTTOM_SHEET_STATES.HIDDEN ||
        !config.closeOnEscape ||
        !event.composedPath().includes(element)
      )
        return;
      event.preventDefault();
      close();
    };

    const handleScrimClick = (event: MouseEvent): void => {
      if ((event.currentTarget !== element || event.target === element) && config.closeOnScrimClick)
        close();
    };

    // showModal() keeps focus off the page; Tab wraps at the ends rather than
    // leaving for the browser's own controls
    const handleTab = (event: KeyboardEvent): void => wrapTab(element, event);

    function open(to: BottomSheetState = BOTTOM_SHEET_STATES.PARTIAL): void {
      if (state === to) return;
      const wasHidden = state === BOTTOM_SHEET_STATES.HIDDEN;

      if (wasHidden && isModal) {
        previouslyFocused = deepActiveElement() as HTMLElement | null;
      }

      if (wasHidden && top) {
        if (!showInTopLayer(element, { kind: "modal" })) element.setAttribute("open", "");
        // styled closed first, so the sheet slides and the backdrop fades in
        void element.offsetWidth;
      }

      setState(to);

      if (wasHidden) {
        trap(true);
        if (isModal) structure.container.focus();
        component.emit(BOTTOM_SHEET_EVENTS.OPEN);
      }
    }

    function close(): void {
      if (state === BOTTOM_SHEET_STATES.HIDDEN) return;
      setState(BOTTOM_SHEET_STATES.HIDDEN);
      trap(false);
      // out of the top layer first: the page is inert until then. The
      // stylesheet keeps it in the top layer while it slides out.
      if (top) hideFromTopLayer(element);

      // focus goes back where it came from, so a keyboard user is not dropped
      // at the top of the page
      if (isModal && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }

      component.emit(BOTTOM_SHEET_EVENTS.CLOSE);
    }

    applyState(state);
    if (state !== BOTTOM_SHEET_STATES.HIDDEN) onStack(true);
    let stopCloses: (() => void) | null = null;
    if (top) {
      element.addEventListener("click", handleScrimClick);
      element.addEventListener("keydown", handleTab);
      // a close the browser made on its own still closes the sheet
      stopCloses = onTopLayerClose(element, close);
      if (state !== BOTTOM_SHEET_STATES.HIDDEN && element.isConnected) {
        showInTopLayer(element, { kind: "modal" });
      }
    } else if (!isModal && config.closeOnEscape) {
      document.addEventListener("keydown", handleKeydown);
    }
    structure.scrim?.addEventListener("click", handleScrimClick);

    return {
      ...component,
      state: {
        open,
        close,
        expand: () => open(BOTTOM_SHEET_STATES.EXPANDED),
        collapse: () => open(BOTTOM_SHEET_STATES.PARTIAL),
        isOpen: () => state !== BOTTOM_SHEET_STATES.HIDDEN,
        getState: () => state,
        setState,
        /** Releases the listeners this feature put on the document */
        release: () => {
          document.removeEventListener("keydown", handleKeydown);
          structure.scrim?.removeEventListener("click", handleScrimClick);
          element.removeEventListener("click", handleScrimClick);
          element.removeEventListener("keydown", handleTab);
          trap(false);
          stopCloses?.();
          if (top) hideFromTopLayer(element);
        },
      },
    };
  };

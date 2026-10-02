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
    let restorePage: (() => void) | null = null;

    // A modal sheet outside the top layer does what showModal() does for one
    // inside it: the page goes inert and Tab stays in the sheet. It did
    // neither (FLO-324).
    const trap = (on: boolean): void => {
      if (!isModal || top) return;
      if (on && !restorePage) {
        restorePage = inertOutside(element);
        element.addEventListener("keydown", handleTab);
      } else if (!on && restorePage) {
        restorePage();
        restorePage = null;
        element.removeEventListener("keydown", handleTab);
      }
    };

    // A modal sheet's place among the open modals, while it is open: Escape
    // is a key press handled there, for the topmost one, in both layers
    let escape: ModalEscape | undefined;
    const onStack = (on: boolean): void => {
      escape?.stop();
      escape = on && isModal
        ? onModalEscape(element, () => {
            if (config.closeOnEscape) close();
          })
        : undefined;
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
      if (event.key !== "Escape") return;
      if (state === BOTTOM_SHEET_STATES.HIDDEN) return;
      if (!config.closeOnEscape) return;
      // A standard sheet (a modal one is on the stack) sits beside the page,
      // not over it: Escape pressed elsewhere (closing a menu, say) is not meant for it (FLO-324)
      if (!event.composedPath().includes(element)) return;
      event.preventDefault();
      close();
    };

    const handleScrimClick = (): void => {
      if (config.closeOnScrimClick) close();
    };

    // In the top layer the root covers the page and a click beside the sheet
    // lands on it, as on the ::backdrop behind it
    const handleBackdropClick = (event: MouseEvent): void => {
      if (event.target === element) handleScrimClick();
    };

    // showModal() keeps focus off the page; Tab wraps at the ends rather than
    // leaving for the browser's own controls
    const handleTab = (event: KeyboardEvent): void => wrapTab(element, event);

    // A close request that is not a key press (a back gesture) reaches the
    // topmost modal as its cancel event; the sheet decides. The `cancel` of
    // the task it opened in is the opening key's, when the page stopped that
    // key press before it reached the window.
    const handleCancel = (event: Event): void => {
      event.preventDefault();
      if (!escape?.opening && config.closeOnEscape) close();
    };

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
      onStack(true);
        if (isModal) structure.container.focus();
        component.emit(BOTTOM_SHEET_EVENTS.OPEN);
      }
    }

    function close(): void {
      if (state === BOTTOM_SHEET_STATES.HIDDEN) return;
      setState(BOTTOM_SHEET_STATES.HIDDEN);
      trap(false);
      onStack(false);
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
      element.addEventListener("cancel", handleCancel);
      element.addEventListener("click", handleBackdropClick);
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
          element.removeEventListener("cancel", handleCancel);
          element.removeEventListener("click", handleBackdropClick);
          element.removeEventListener("keydown", handleTab);
          trap(false);
          onStack(false);
          stopCloses?.();
          if (top) hideFromTopLayer(element);
        },
      },
    };
  };

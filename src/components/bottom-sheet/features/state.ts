// src/components/bottom-sheet/features/state.ts

import { BottomSheetConfig, BottomSheetState } from "../types";
import {
  BOTTOM_SHEET_CLASSES,
  BOTTOM_SHEET_EVENTS,
  BOTTOM_SHEET_STATES,
  BOTTOM_SHEET_VARIANTS,
} from "../constants";
import { onTopLayerClose, showInTopLayer } from "../../../core/dom/layer";
import { createSheetModal } from "../../../core/dom/sheet-modal";

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
    const { onStack, trap, captureFocus, restoreFocus, enterTopLayer, leaveTopLayer, handleTab } =
      createSheetModal(element, isModal, top, config, close);

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

    function open(to: BottomSheetState = BOTTOM_SHEET_STATES.PARTIAL): void {
      if (state === to) return;
      const wasHidden = state === BOTTOM_SHEET_STATES.HIDDEN;

      if (wasHidden && isModal) captureFocus();

      if (wasHidden && top) enterTopLayer();

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
      if (top) leaveTopLayer();

      // focus goes back where it came from, so a keyboard user is not dropped
      // at the top of the page
      restoreFocus();

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
          if (top) leaveTopLayer();
        },
      },
    };
  };

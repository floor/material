// src/components/side-sheet/features/state.ts

import { SideSheetConfig } from "../types";
import {
  SIDE_SHEET_CLASSES,
  SIDE_SHEET_EVENTS,
  SIDE_SHEET_VARIANTS,
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
    closeButton: HTMLButtonElement | null;
  };
}

/**
 * Opening and closing, and everything that closes it.
 *
 * Events go through `component.emit`, which is what the composed events
 * enhancer provides.
 */
export const withState =
  (config: SideSheetConfig) =>
  <C extends StateComponent>(component: C) => {
    const { element, getClass, structure } = component;
    const root = getClass(SIDE_SHEET_CLASSES.ROOT);
    const isModal = config.variant === SIDE_SHEET_VARIANTS.MODAL;
    // A modal sheet whose root is a <dialog> shown with showModal()
    const top = config.layer === "top";

    let open = false;
    const { onStack, trap, captureFocus, restoreFocus, enterTopLayer, leaveTopLayer, handleTab } =
      createSheetModal(element, isModal, top, config, hide);

    const apply = (): void => {
      element.classList.toggle(`${root}--open`, open);
      element.setAttribute("aria-hidden", open ? "false" : "true");
      // a closed sheet must not intercept clicks meant for the page
      element.style.pointerEvents = open ? "" : "none";
    };

    function show(): void {
      if (open) return;
      if (isModal) captureFocus();
      if (top) enterTopLayer();
      open = true;
      apply();
      trap(true);
      if (isModal) structure.container.focus();
      component.emit(SIDE_SHEET_EVENTS.OPEN);
    }

    function hide(): void {
      if (!open) return;
      open = false;
      apply();
      trap(false);
      // out of the top layer first: the page is inert until then. The
      // stylesheet keeps it in the top layer while it slides out.
      if (top) leaveTopLayer();
      // focus returns to whatever opened the sheet
      restoreFocus();
      component.emit(SIDE_SHEET_EVENTS.CLOSE);
    }

    const handleKeydown = (event: KeyboardEvent): void => {
      if (
        event.key !== "Escape" ||
        !open ||
        !config.closeOnEscape ||
        !event.composedPath().includes(element)
      )
        return;
      event.preventDefault();
      hide();
    };
    const handleScrimClick = (event: MouseEvent): void => {
      if ((event.currentTarget !== element || event.target === element) && config.closeOnScrimClick)
        hide();
    };

    if (config.open) open = true;
    apply();
    if (open) onStack(true);

    let stopCloses: (() => void) | null = null;
    if (top) {
      element.addEventListener("click", handleScrimClick);
      element.addEventListener("keydown", handleTab);
      // a close the browser made on its own still closes the sheet
      stopCloses = onTopLayerClose(element, hide);
      if (open && element.isConnected) showInTopLayer(element, { kind: "modal" });
    } else if (!isModal && config.closeOnEscape) {
      document.addEventListener("keydown", handleKeydown);
    }
    structure.scrim?.addEventListener("click", handleScrimClick);
    structure.closeButton?.addEventListener("click", hide);

    return {
      ...component,
      state: {
        open: show,
        close: hide,
        toggle: () => (open ? hide() : show()),
        isOpen: () => open,
        /** Releases the listeners this feature put on the document */
        release: () => {
          document.removeEventListener("keydown", handleKeydown);
          structure.scrim?.removeEventListener("click", handleScrimClick);
          structure.closeButton?.removeEventListener("click", hide);
          element.removeEventListener("click", handleScrimClick);
          element.removeEventListener("keydown", handleTab);
          trap(false);
          stopCloses?.();
          if (top) leaveTopLayer();
        },
      },
    };
  };

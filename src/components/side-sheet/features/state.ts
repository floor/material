// src/components/side-sheet/features/state.ts

import { SideSheetConfig } from "../types";
import {
  SIDE_SHEET_CLASSES,
  SIDE_SHEET_EVENTS,
  SIDE_SHEET_VARIANTS,
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
              if (config.closeOnEscape) hide();
            })
          : undefined;
    };

    // A modal sheet outside the top layer does what showModal() does for one
    // inside it: the page goes inert and Tab stays in the sheet
    const trap = (on: boolean): void => {
      onStack(on);
      if (!isModal || top) return;
      restorePage?.();
      restorePage = on ? inertOutside(element) : undefined;
      if (on) element.addEventListener("keydown", handleTab);
      else element.removeEventListener("keydown", handleTab);
    };

    const apply = (): void => {
      element.classList.toggle(`${root}--open`, open);
      element.setAttribute("aria-hidden", open ? "false" : "true");
      // a closed sheet must not intercept clicks meant for the page
      element.style.pointerEvents = open ? "" : "none";
    };

    function show(): void {
      if (open) return;
      if (isModal) previouslyFocused = deepActiveElement() as HTMLElement | null;
      if (top) {
        if (!showInTopLayer(element, { kind: "modal" })) element.setAttribute("open", "");
        // styled closed first, so the sheet slides and the backdrop fades in
        void element.offsetWidth;
      }
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
      if (top) hideFromTopLayer(element);
      // focus returns to whatever opened the sheet
      if (isModal && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
        previouslyFocused = null;
      }
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

    // showModal() keeps focus off the page; Tab wraps at the ends rather than
    // leaving for the browser's own controls
    const handleTab = (event: KeyboardEvent): void => wrapTab(element, event);

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
          if (top) hideFromTopLayer(element);
        },
      },
    };
  };

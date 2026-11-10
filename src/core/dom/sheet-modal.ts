// Reading estimate of root all-js gzip, not a CI measure: shared sheet modal lifecycle about 150 B (plan 180, band 120–260).
// Private modal stack, inert trap, focus and open-time top-layer enter/leave for side and bottom sheets.
// Not a public export. Height, open state, scrim and the initial top-layer show stay in each sheet.

import { deepActiveElement, wrapTab } from "./focus";
import {
  hideFromTopLayer,
  inertOutside,
  onModalEscape,
  showInTopLayer,
  type ModalEscape,
} from "./layer";

interface SheetEscapeConfig {
  closeOnEscape?: boolean;
}

export const createSheetModal = (
  element: HTMLElement,
  isModal: boolean,
  top: boolean,
  config: SheetEscapeConfig,
  close: () => void,
) => {
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

  // showModal() keeps focus off the page; Tab wraps at the ends rather than
  // leaving for the browser's own controls
  const handleTab = (event: KeyboardEvent): void => wrapTab(element, event);

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

  const captureFocus = (): void => {
    previouslyFocused = deepActiveElement() as HTMLElement | null;
  };

  const restoreFocus = (): void => {
    if (isModal && previouslyFocused?.isConnected) {
      previouslyFocused.focus();
      previouslyFocused = null;
    }
  };

  // Open-time entry only. A sheet that is already open at creation uses
  // showInTopLayer by itself, with no open attribute and no offset read.
  const enterTopLayer = (): void => {
    if (!showInTopLayer(element, { kind: "modal" })) element.setAttribute("open", "");
    // styled closed first, so the sheet slides and the backdrop fades in
    void element.offsetWidth;
  };

  const leaveTopLayer = (): void => {
    hideFromTopLayer(element);
  };

  return { onStack, trap, captureFocus, restoreFocus, enterTopLayer, leaveTopLayer, handleTab };
};

// src/components/snackbar/layer.ts
import { deepActiveElement } from '../../core/dom/focus';

// Checked by shape, not instanceof: the nodes may come from another realm
// (a frame, a test DOM)
const hostOf = (node: Node): Element | null => (node as Partial<ShadowRoot>).host ?? null;

/** The node above this one across shadow roots: its parent, or a root's host */
const up = (node: Node): Node | null => {
  const parent = node.parentNode;
  return parent && parent.nodeType === 11 ? hostOf(parent) : parent;
};

const isModal = (node: Node): node is HTMLDialogElement =>
  (node as Element).localName === 'dialog' && (node as Element).matches(':modal');

/** The modal dialogs of a tree and the open shadow roots in it, in tree order */
const modalsIn = (root: Document | ShadowRoot, found: HTMLDialogElement[]): HTMLDialogElement[] => {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (isModal(element)) found.push(element);
    if (element.shadowRoot) modalsIn(element.shadowRoot, found);
  }
  return found;
};

/**
 * The modal `<dialog>` the page is blocked by, the topmost. The browser keeps
 * focus inside it, so it is the first modal dialog above the focused element,
 * in whatever shadow root. With focus nowhere (the body), the last modal
 * dialog of the document and its open shadow roots: a nested modal comes
 * after the one it opened from.
 */
const blockingDialog = (doc: Document): HTMLDialogElement | null => {
  const active = deepActiveElement();
  for (let node: Node | null = active; node; node = up(node)) {
    if (isModal(node)) return node;
  }
  if (active && active !== doc.body) return null;
  const modals = modalsIn(doc, []);
  return modals[modals.length - 1] ?? null;
};

const within = (node: Node, ancestor: Node): boolean => {
  for (let current: Node | null = node; current; current = up(current)) {
    if (current === ancestor) return true;
  }
  return false;
};

/**
 * Places a top-layer snackbar while it shows, and returns how to put it back
 * once it is hidden.
 *
 * It opens where its owner put it (an element's shadow root), or on the body
 * as without a layer. While a modal `<dialog>` is open, though, everything
 * outside it is inert, top layer or not: it cannot be clicked and is not
 * announced. The snackbar then goes inside the topmost modal dialog, above
 * it. Coming from a shadow root into another tree, it is carried in a shadow
 * root of its own that adopts the same stylesheets.
 *
 * The place follows the modals while the snackbar shows. A modal opening
 * moves focus into itself, and the snackbar follows it there; the modal it is
 * in closing sends it back to the modal below, or home. A move takes the
 * element out of the top layer, so `moved` shows it again, above everything
 * that opened since. Nothing else changes: the snackbar stays open, its
 * timer runs on, and it closes once.
 *
 * @param element - The snackbar element
 * @param moved - Called after each move
 * @returns Restores the element to where it was, or takes it off the page
 */
export const placeInLayer = (element: HTMLElement, moved: () => void): (() => void) => {
  const doc = element.ownerDocument;
  const parent = element.parentNode;
  const next = element.nextSibling;
  const home = parent ?? doc.body;
  let dialog: HTMLDialogElement | null = null;
  let carrier: HTMLElement | null = null;

  const leave = (): void => {
    dialog?.removeEventListener('close', place);
    carrier?.remove();
    carrier = null;
    dialog = null;
  };

  function place(): void {
    const blocking = blockingDialog(doc);
    const target = blocking && !within(home, blocking) ? blocking : null;
    if (target === dialog && element.isConnected) return;
    leave();
    if (target) {
      const root = home.getRootNode() as ShadowRoot;
      if (hostOf(root) && root !== target.getRootNode()) {
        carrier = doc.createElement('div');
        carrier.style.display = 'contents';
        const shadow = carrier.attachShadow({ mode: 'open' });
        shadow.adoptedStyleSheets = root.adoptedStyleSheets;
        shadow.append(element);
        target.append(carrier);
      } else {
        target.append(element);
      }
      dialog = target;
      target.addEventListener('close', place);
    } else {
      home.insertBefore(element, next && next.parentNode === home ? next : null);
    }
    moved();
  }

  place();
  doc.addEventListener('focusin', place, true);

  return (): void => {
    doc.removeEventListener('focusin', place, true);
    leave();
    if (parent) parent.insertBefore(element, next && next.parentNode === parent ? next : null);
    else element.remove();
  };
};

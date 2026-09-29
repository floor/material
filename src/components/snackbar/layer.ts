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

/**
 * The modal `<dialog>` the page is blocked by. Focus is kept inside it, so it
 * is found from the focused element, in whatever shadow root; failing that,
 * the last modal dialog of the document.
 */
const blockingDialog = (doc: Document): HTMLDialogElement | null => {
  for (let node: Node | null = deepActiveElement(); node; node = up(node)) {
    if (isModal(node)) return node;
  }
  const modals = Array.from(doc.querySelectorAll('dialog')).filter(isModal);
  return modals[modals.length - 1] ?? null;
};

const within = (node: Node, ancestor: Node): boolean => {
  for (let current: Node | null = node; current; current = up(current)) {
    if (current === ancestor) return true;
  }
  return false;
};

/**
 * Places a top-layer snackbar before it is shown, and returns how to put it
 * back once it is hidden.
 *
 * It opens where its owner put it (an element's shadow root), or on the body
 * as without a layer. While a modal `<dialog>` is open, though, everything
 * outside it is inert, top layer or not: it cannot be clicked and is not
 * announced. The snackbar then opens inside that dialog, above it, and goes
 * back when it closes. Coming from a shadow root into another tree, it is
 * carried in a shadow root of its own that adopts the same stylesheets.
 *
 * @param element - The snackbar element
 * @returns Restores the element to where it was, or takes it off the page
 */
export const placeInLayer = (element: HTMLElement): (() => void) => {
  const doc = element.ownerDocument;
  const parent = element.parentNode;
  const next = element.nextSibling;
  const dialog = blockingDialog(doc);
  let carrier: HTMLElement | null = null;

  if (dialog && !within(element, dialog)) {
    const root = element.getRootNode() as ShadowRoot;
    if (hostOf(root) && root !== dialog.getRootNode()) {
      carrier = doc.createElement('div');
      carrier.style.display = 'contents';
      const shadow = carrier.attachShadow({ mode: 'open' });
      shadow.adoptedStyleSheets = root.adoptedStyleSheets;
      shadow.append(element);
      dialog.append(carrier);
    } else {
      dialog.append(element);
    }
  } else if (!parent) {
    doc.body.appendChild(element);
  }

  return (): void => {
    if (parent) parent.insertBefore(element, next && next.parentNode === parent ? next : null);
    else element.remove();
    carrier?.remove();
  };
};

// Slot name for a custom element's icon. The factory walk lives in
// icon-decorate.ts and is off until that module is loaded, and it cannot see
// light DOM before the slot is in a shadow root. This module is what the
// element calls after the slot is appended. The button factory does not import it.
// The icon is the direct child `withIcon` marked with a `__icon` class. A host
// class such as `mtrl-button--icon` is the control, not the graphic.

/**
 * The icon span `withIcon` placed on `host`.
 * A modifier that merely ends in `-icon` is not it.
 */
const factoryIcon = (host: HTMLElement): HTMLElement | null => {
  const children = host.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as HTMLElement;
    const classes = child.classList;
    if (!classes) continue;
    // The server classList shim has no item(); Array.from is how render walks it.
    for (const name of Array.from(classes)) {
      if (name.endsWith("__icon")) return child;
    }
  }
  return null;
};

/**
 * The custom element whose light DOM a slot was built to show.
 * Server rendering mounts the same way: the name is already a child of the host.
 */
const slotHosts = new WeakMap<Node, HTMLElement>();

/** Remember which host's light DOM `slot` shows. The map does not write attributes. */
export const bindSlotHost = (slot: Node, host: HTMLElement): void => {
  slotHosts.set(slot, host);
};

/**
 * Light-DOM nodes a slot shows once it is in its host's shadow root.
 * Text and elements only: a comment is not a slottable. An element matches
 * the slot's name; a text node matches the default slot.
 */
const lightNodes = (host: HTMLElement, slot: HTMLElement): Node[] => {
  const name = slot.getAttribute("name") ?? "";
  const nodes: Node[] = [];
  for (const node of host.childNodes) {
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;
    const slotName = node.nodeType === Node.ELEMENT_NODE ? ((node as Element).getAttribute("slot") ?? "") : "";
    if (slotName === name) nodes.push(node);
  }
  return nodes;
};

/**
 * Nodes the slot is showing from its host.
 * `null` means nothing is assigned, so the slot shows its own fallback children.
 * An unassigned slot's `assignedNodes()` is an empty list in a browser. linkedom
 * instead returns those fallback children. A whitespace text node is assigned,
 * and then the fallback is not shown.
 */
const slottedNodes = (el: HTMLElement): Node[] | null => {
  const read = (el as { assignedNodes?: () => Node[] }).assignedNodes;
  if (typeof read !== "function") return null;
  const assigned = read.call(el);
  if (assigned.length === 0) return null;
  const fallback = el.childNodes;
  if (assigned.length === fallback.length && assigned.every((node, index) => node === fallback[index])) {
    return null;
  }
  return assigned;
};

/** What the slot puts on screen: assigned nodes, else the host's light DOM, else its fallback. */
const shownBySlot = (el: HTMLElement): Iterable<Node> => {
  const assigned = slottedNodes(el);
  if (assigned) return assigned;
  const host = slotHosts.get(el);
  if (host) {
    const nodes = lightNodes(host, el);
    if (nodes.length) return nodes;
  }
  return el.childNodes;
};

/** True when `node` contributes text that is not inside `icon`. */
const hasText = (node: Node, icon: HTMLElement): boolean => {
  if (node === icon) return false;
  if (node.nodeType === Node.TEXT_NODE) return !!(node.textContent ?? "").trim();
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  if (icon.contains(el) || el.getAttribute("aria-hidden") === "true") return false;
  if ((el.getAttribute("aria-label") ?? "").trim()) return true;
  if (el.localName === "img" && (el.getAttribute("alt") ?? "").trim()) return true;
  // A slot's name is the text it shows. `localName` avoids a constructor the
  // public SSR scope might not install. Fallback text and assigned light DOM
  // are different nodes; only the one on screen can name the control.
  const nodes = el.localName === "slot" ? shownBySlot(el) : el.childNodes;
  for (const child of nodes) if (hasText(child, icon)) return true;
  return false;
};

/** The control keeps a name that does not come from its icon. */
const keepsName = (host: HTMLElement, icon: HTMLElement): boolean => {
  if ((host.getAttribute("aria-label") ?? "").trim()) return true;
  const labelledBy = (host.getAttribute("aria-labelledby") ?? "").trim();
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const ref = host.ownerDocument.getElementById(id);
      if (ref && ref !== host && !icon.contains(ref) && hasText(ref, icon)) return true;
    }
  }
  for (const child of host.childNodes) if (hasText(child, icon)) return true;
  return false;
};

/**
 * Hides the icon when the slotted control still has a name without it.
 * Called after the slot is in the shadow root, and again when that slot's
 * light DOM or fallback changes.
 */
export const syncSlottedIcon = (host: HTMLElement): void => {
  const icon = factoryIcon(host);
  if (!icon) return;
  if (keepsName(host, icon)) icon.setAttribute("aria-hidden", "true");
  else icon.removeAttribute("aria-hidden");
};

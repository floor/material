// src/core/compose/features/icon-decorate.ts
//
// Factory name walk. icon.ts does not import this module, so createButton
// leaves icons untouched until enableDecorativeIcons() runs in the same bundle.
// A slot's light DOM is decided in icon-slot.ts; this walk has no slot assignment yet.

import { decorativeIcon, registerDecorativeSync } from "./icon";

/** True when `node` contributes text that is not inside `icon`. */
const hasText = (node: Node, icon: HTMLElement): boolean => {
  if (node === icon) return false;
  if (node.nodeType === Node.TEXT_NODE) return !!(node.textContent ?? "").trim();
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  if (icon.contains(el) || el.getAttribute("aria-hidden") === "true") return false;
  if ((el.getAttribute("aria-label") ?? "").trim()) return true;
  // alt is the attribute. The public SSR scope does not install HTMLImageElement.
  if (el.localName === "img" && (el.getAttribute("alt") ?? "").trim()) return true;
  for (const child of el.childNodes) if (hasText(child, icon)) return true;
  return false;
};

/**
 * The control keeps a name that does not come from its icon.
 * Whitespace and missing label references do not count.
 */
const keepsNameWithoutIcon = (host: HTMLElement, icon: HTMLElement): boolean => {
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

const sync = (host: HTMLElement): void => {
  const icon = decorativeIcon(host);
  if (!icon) return;
  // The author's svg string is not rewritten (https://w3c.github.io/aria/#aria-hidden).
  if (keepsNameWithoutIcon(host, icon)) icon.setAttribute("aria-hidden", "true");
  else icon.removeAttribute("aria-hidden");
};

/** Turn the factory name walk on. Default output stays unchanged until this runs. */
export const enableDecorativeIcons = (): void => {
  registerDecorativeSync(sync);
};

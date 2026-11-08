// src/core/compose/features/icon-decorate.ts
//
// Factory name walk. The button, text-field, and form graphs do not import
// this module, so their default HTML stays the recorded bytes.
// A slot's light DOM is decided in icon-slot.ts; this walk has no slot assignment yet.

import { setDecorativeIcons } from "./icon-opt-in";

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

/** Icons `withIcon` creates. A `--icon` modifier on the host is not one. */
const isFactoryIcon = (el: Element): boolean => {
  for (const name of Array.from(el.classList)) {
    if (name.endsWith("-button__icon") || name.endsWith("-fab__icon") || name.endsWith("-slider__icon")) return true;
  }
  return false;
};

const syncFactoryIcon = (icon: HTMLElement): void => {
  const host = icon.parentElement;
  if (!host) return;
  // The author's svg string is not rewritten (https://w3c.github.io/aria/#aria-hidden).
  if (keepsNameWithoutIcon(host, icon)) {
    if (icon.getAttribute("aria-hidden") !== "true") icon.setAttribute("aria-hidden", "true");
  } else if (icon.hasAttribute("aria-hidden")) {
    icon.removeAttribute("aria-hidden");
  }
};

/** A labelled text-field trailing icon. The unmarked span is already hidden. */
const isTrailingButton = (el: Element): boolean => {
  for (const name of Array.from(el.classList)) {
    if (name.endsWith("__trailing-icon--button")) return true;
  }
  return false;
};

/**
 * Moves the graphic into a library span. The author's svg attributes stay.
 * https://w3c.github.io/aria/#aria-hidden
 */
const syncTrailing = (button: HTMLElement): void => {
  const only = button.firstElementChild;
  if (
    button.childNodes.length === 1 &&
    only?.tagName === "SPAN" &&
    only.getAttribute("aria-hidden") === "true"
  ) return;
  if (!button.firstChild) return;
  const wrap = document.createElement("span");
  wrap.setAttribute("aria-hidden", "true");
  while (button.firstChild) wrap.appendChild(button.firstChild);
  button.appendChild(wrap);
};

const scan = (root: ParentNode): void => {
  const nodes = root.querySelectorAll("[class*='__icon'], [class*='trailing-icon--button']");
  for (const el of nodes) {
    if (isTrailingButton(el)) syncTrailing(el as HTMLElement);
    else if (isFactoryIcon(el)) syncFactoryIcon(el as HTMLElement);
  }
};

let watching = false;

/** Turn the factory name walk on. Default output stays unchanged until this runs. */
export const enableDecorativeIcons = (): void => {
  setDecorativeIcons(true);
  if (watching || typeof document === "undefined") return;
  watching = true;
  const run = (): void => scan(document);
  run();
  if (typeof MutationObserver !== "function") return;
  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "aria-labelledby", "class"],
  });
};

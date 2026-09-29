// src/elements/dialog.ts
/**
 * `<m-dialog>`: the dialog as a custom element. It is the factory's top-layer
 * dialog (`layer: "top"`): a native `<dialog>` in the element's shadow root,
 * shown with `showModal()`, so it sits above every z-index and outside any
 * clipping ancestor, the page outside is inert, and the scrim is its
 * `::backdrop`. Its regions are slots:
 *
 * - `headline`: the headline, which names the dialog (the `headline`
 *   attribute is its fallback text); without one, `aria-label` names it;
 * - the default slot: the supporting content, which describes it;
 * - `actions`: the buttons, at the end.
 *
 * `open` shows it and reflects its state, as on `<dialog open>`: Escape, a
 * click on the backdrop, the full-screen close button and `close()` remove
 * it. `show()` and `close()` are its methods. `open` and `close` are
 * dispatched as it opens and closes (not when the attribute is what changed),
 * and `cancel` when Escape asks it to close, which `preventDefault()` refuses.
 * `size` is the factory's (`small`, `medium`, `large`, `fullwidth`,
 * `fullscreen`), and `fullscreen` the full-screen dialog whatever `size`
 * says; a full-screen dialog has the close button, which `close-button`
 * gives any size. `subtitle` is the text below the headline, `divider`
 * draws the dividers above and below the content, and `footer-alignment`
 * places the actions (`right`, `left`, `center`, `space-between`).
 * `no-close-on-scrim-click` and `no-close-on-escape` keep it open on a click
 * on the backdrop and on Escape (the factory's `closeOnOverlayClick` and
 * `closeOnEscape`); `cancel` is still dispatched on Escape.
 *
 * @module elements
 */

import createDialog from "../components/dialog";
import type { DialogComponent, DialogConfig } from "../components/dialog/types";
import { createDivider } from "../components/divider";
import { PREFIX } from "../core/config";
import { defineElement, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

/** The dialog with the `show()` the element names after `<dialog>`'s. */
export interface DialogElementComponent extends DialogComponent {
  show: () => DialogComponent;
}

interface DialogElementConfig extends DialogConfig {
  headline?: string;
  fullscreen?: boolean;
  noCloseOnScrimClick?: boolean;
  noCloseOnEscape?: boolean;
}

const FOOTER_ALIGNMENTS = ["left", "center", "space-between"];

/** Places the actions, as the factory's `setFooterAlignment` does on its own footer. */
const setFooterAlignment = (footer: HTMLElement, alignment: unknown): void => {
  for (const name of FOOTER_ALIGNMENTS) {
    footer.classList.toggle(`${PREFIX}-dialog__footer--${name}`, name === alignment);
  }
};

/** Sets the text below the headline; an empty one is taken out. */
const setSubtitle = (component: DialogComponent, value: unknown): void => {
  component.setSubtitle(value === null || value === undefined ? "" : String(value));
  const subtitle = component.element.querySelector<HTMLElement>(`.${PREFIX}-dialog__header-subtitle`);
  if (subtitle && !subtitle.textContent) subtitle.remove();
};

const slot = (name?: string, fallback?: string): HTMLSlotElement => {
  const element = document.createElement("slot");
  if (name) element.name = name;
  if (fallback) element.textContent = fallback;
  return element;
};

/**
 * The factory takes text for the headline and markup for the content: the
 * element builds it with placeholders, which give the dialog its name and
 * description, and puts slots in their place. The footer is the factory's
 * own, holding the `actions` slot.
 */
const create = (config: DialogElementConfig): DialogElementComponent => {
  const { headline, fullscreen, noCloseOnScrimClick, noCloseOnEscape, footerAlignment, ...rest } = config;
  const dialog = createDialog({
    ...rest,
    title: " ",
    content: " ",
    ...(fullscreen ? { size: "fullscreen" } : {}),
    closeOnOverlayClick: !noCloseOnScrimClick,
    closeOnEscape: !noCloseOnEscape,
    // Opened by the element once it is in the shadow root: moving a modal
    // <dialog> takes it out of the top layer
    open: false,
    layer: "top",
  });
  dialog.element.querySelector(`.${PREFIX}-dialog__header-title`)?.replaceChildren(slot("headline", headline));
  dialog.getContentElement()?.replaceChildren(slot());
  const footer = document.createElement("div");
  footer.className = `${PREFIX}-dialog__footer`;
  footer.append(slot("actions"));
  setFooterAlignment(footer, footerAlignment);
  // The factory draws the divider above its own footer only
  if (config.divider) {
    dialog.element.append(
      createDivider({ variant: "full-width", class: `${PREFIX}-dialog__divider ${PREFIX}-dialog__footer-divider` }).element
    );
  }
  dialog.element.append(footer);
  return Object.assign(dialog, { show: () => dialog.open() });
};

const hasContent = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "");

/**
 * A headline shows, and names the dialog, when it has slotted content or
 * fallback text; `aria-label` names a dialog in its place. The actions row
 * shows when it has buttons.
 */
const syncRegions = (host: HTMLElement, component: DialogElementComponent): void => {
  const { element } = component;
  const title = element.querySelector<HTMLElement>(`.${PREFIX}-dialog__header-title`);
  const headline = title?.querySelector<HTMLSlotElement>("slot");
  const footer = element.querySelector<HTMLElement>(`.${PREFIX}-dialog__footer`);
  const actions = footer?.querySelector<HTMLSlotElement>("slot");
  const named = !!headline && (headline.assignedNodes().some(hasContent) || (headline.textContent ?? "") !== "");
  if (title) title.style.display = named ? "" : "none";
  const shown = actions?.assignedElements().length ? "" : "none";
  if (footer) footer.style.display = shown;
  const divider = element.querySelector<HTMLElement>(`.${PREFIX}-dialog__footer-divider`);
  if (divider) divider.style.display = shown;
  const label = host.getAttribute("aria-label");
  if (label !== null) {
    element.setAttribute("aria-label", label);
    element.removeAttribute("aria-labelledby");
  } else {
    element.removeAttribute("aria-label");
    if (named && title) element.setAttribute("aria-labelledby", title.id);
    else element.removeAttribute("aria-labelledby");
  }
};

const setOpen = (component: DialogElementComponent, open: boolean): void => {
  if (open === component.isOpen()) return;
  if (open) component.open();
  else component.close();
};

const dialogSpec = {
  name: "dialog",
  create: (config) => create(config as DialogElementConfig),
  styles: ["dialog"],
  hostStyles: ":host{display:contents}",
  attributes: {
    open: { type: "boolean", update: (c, v) => setOpen(c, !!v) },
    headline: {
      type: "string",
      config: "headline",
      update: (c, v, host) => {
        const headline = c.element.querySelector<HTMLSlotElement>('slot[name="headline"]');
        if (headline) headline.textContent = v === null ? "" : String(v);
        syncRegions(host, c);
      },
    },
    subtitle: { type: "string", config: "subtitle", update: (c, v) => setSubtitle(c, v) },
    size: { type: "string", config: "size" },
    fullscreen: { type: "boolean", config: "fullscreen" },
    "close-button": { type: "boolean", config: "closeButton" },
    divider: { type: "boolean", config: "divider" },
    "footer-alignment": {
      type: "string",
      config: "footerAlignment",
      update: (c, v) => {
        const footer = c.element.querySelector<HTMLElement>(`.${PREFIX}-dialog__footer`);
        if (footer) setFooterAlignment(footer, v);
      },
    },
    "no-close-on-scrim-click": { type: "boolean", config: "noCloseOnScrimClick" },
    "no-close-on-escape": { type: "boolean", config: "noCloseOnEscape" },
    "aria-label": { type: "string", update: (c, _v, host) => syncRegions(host, c) },
  },
  methods: ["show", "close"] as const,
  events: {
    open: { detail: () => null, state: true },
    close: { detail: () => null, state: true },
    // Dispatched by `setup` before Escape closes the dialog. Listed here for
    // its type and the adapters.
    cancel: { detail: () => null },
  },
  setup: (host, component) => {
    const { element } = component;
    const sync = (): void => syncRegions(host, component);
    const slots = Array.from(element.querySelectorAll("slot"));
    slots.forEach((s) => s.addEventListener("slotchange", sync));
    sync();
    // `open` reflects the dialog's state, as on <dialog>.
    const reflect = (): void => void host.toggleAttribute("open", component.isOpen());
    component.on("open", reflect);
    component.on("close", reflect);
    // Escape reaches the <dialog> as `cancel`: the host asks first, and a
    // refusal stops the factory's own listener, which would close it.
    const onCancel = (event: Event): void => {
      if (host.dispatchEvent(new CustomEvent("cancel", { detail: null, cancelable: true, bubbles: true, composed: true }))) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    element.addEventListener("cancel", onCancel, true);
    if (host.hasAttribute("open")) component.open();
    return () => {
      slots.forEach((s) => s.removeEventListener("slotchange", sync));
      component.off("open", reflect);
      component.off("close", reflect);
      element.removeEventListener("cancel", onCancel, true);
    };
  },
} satisfies ElementSpec<DialogElementComponent>;

export const dialogElement = defineElement<DialogElementComponent>(dialogSpec);
export type DialogSpec = typeof dialogSpec;
/** `<m-dialog>` as a ref or a query returns it. */
export type DialogElement = ElementInstance<DialogSpec, DialogElementComponent>;

/** Registers `<m-dialog>` (or `<prefix-dialog>`). */
export const defineDialog = (options?: DefineOptions): string => dialogElement.define(options);

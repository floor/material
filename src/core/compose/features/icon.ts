// src/core/compose/features/icon.ts

import { BaseComponent, ElementComponent } from "../component";

import { setHTML } from "../../dom/html";

/** The icon span this feature creates: a direct child whose class token is `{prefix}-icon`. */
const iconChild = (host: HTMLElement): HTMLElement | null => {
  for (const child of host.children) {
    if (!(child instanceof HTMLElement)) continue;
    for (const name of child.classList) {
      if (name.endsWith("-icon") && !name.includes("__")) return child;
    }
  }
  return null;
};

/**
 * The custom element whose light DOM a slot was built to show.
 * The factory decides the icon before that slot is in a shadow root, so
 * `assignedNodes()` cannot see the host's children yet. Server rendering
 * mounts the same way: the name is already a child of the host.
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

/** True when `node` contributes text that is not inside `skip`. */
const hasText = (node: Node, skip: HTMLElement | null, skipHidden: boolean): boolean => {
  if (skip && node === skip) return false;
  if (node.nodeType === Node.TEXT_NODE) return !!(node.textContent ?? "").trim();
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  if (skip?.contains(el)) return false;
  if (skipHidden && el.getAttribute("aria-hidden") === "true") return false;
  if ((el.getAttribute("aria-label") ?? "").trim()) return true;
  // alt is the attribute. The public SSR scope does not install HTMLImageElement.
  if (el.localName === "img" && (el.getAttribute("alt") ?? "").trim()) return true;
  // A slot's name is the text it shows. `localName` avoids a constructor the
  // public SSR scope might not install. Fallback text and assigned light DOM
  // are different nodes; only the one on screen can name the control.
  const nodes = el.localName === "slot" ? shownBySlot(el) : el.childNodes;
  for (const child of nodes) {
    if (hasText(child, skip, skipHidden)) return true;
  }
  return false;
};

/**
 * The control keeps a name that does not come from its icon.
 * Whitespace and missing label references do not count.
 */
const keepsNameWithoutIcon = (host: HTMLElement, iconEl: HTMLElement): boolean => {
  if ((host.getAttribute("aria-label") ?? "").trim()) return true;
  const labelledBy = (host.getAttribute("aria-labelledby") ?? "").trim();
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      const ref = host.ownerDocument.getElementById(id);
      if (!ref || ref === host || iconEl.contains(ref)) continue;
      if (hasText(ref, null, false)) return true;
    }
  }
  for (const child of host.childNodes) {
    if (hasText(child, iconEl, true)) return true;
  }
  return false;
};

/**
 * Hides the icon when the control still has a name without it, and shows it
 * again when that name is gone. Called again after setIcon, setText, and
 * setAriaLabel, and after a custom element's slot is in its shadow root.
 */
export const syncDecorativeIcon = (host: HTMLElement): void => {
  const iconEl = iconChild(host);
  if (!iconEl) return;
  if (keepsNameWithoutIcon(host, iconEl)) iconEl.setAttribute("aria-hidden", "true");
  else iconEl.removeAttribute("aria-hidden");
};

/**
 * Icon manager interface
 */
export interface IconManager {
  /**
   * Sets icon HTML content
   * @param html - Icon HTML content
   * @returns IconManager instance for chaining
   */
  setIcon: (html: string) => IconManager;

  /**
   * Gets current icon HTML content
   * @returns Current icon HTML
   */
  getIcon: () => string;

  /**
   * Gets icon element
   * @returns Icon element or null if not created
   */
  getElement: () => HTMLElement | null;
}

/**
 * Configuration for icon feature
 */
export interface IconConfig {
  /**
   * Initial icon HTML content
   */
  icon?: string;

  /**
   * Icon position ('start' or 'end')
   */
  iconPosition?: "start" | "end";

  /**
   * Icon size variant
   */
  iconSize?: string;

  /**
   * CSS class prefix
   */
  prefix?: string;

  /**
   * Component name for class generation
   */
  componentName?: string;

  /**
   * Text content (for determining button styling)
   */
  text?: string | Node;
}

/**
 * Component with icon capabilities
 */
export interface IconComponent extends BaseComponent {
  /**
   * Icon manager
   */
  icon: IconManager;
}

/**
 * Creates an icon manager for a component
 *
 * @param element - Parent element
 * @param config - Icon configuration
 * @returns Icon manager interface
 * @private
 */
const createIcon = (
  element: HTMLElement,
  config: IconConfig = {},
): IconManager => {
  let iconElement: HTMLElement | null = null;
  const PREFIX = config.prefix || "mtrl";

  /**
   * Creates the actual icon DOM element
   */
  const createIconElement = (html: string): HTMLElement => {
    const iconEl = document.createElement("span");
    iconEl.className = `${PREFIX}-icon`;

    // Add component-specific class. BEM: this is the component's icon
    // element, and it is emitted for every component applying withIcon --
    // button, extended-fab, fab, icon-button and slider -- so the name is
    // settled here rather than five times over.
    const componentClass = `${PREFIX}-${
      config.componentName || "component"
    }__icon`;
    iconEl.classList.add(componentClass);

    // Add position class if specified
    if (config.iconPosition) {
      iconEl.classList.add(`${componentClass}--${config.iconPosition}`);
    }

    // Add size class if specified
    if (config.iconSize) {
      iconEl.classList.add(`${PREFIX}-icon--${config.iconSize}`);
    }

    setHTML(iconEl, html);
    return iconEl;
  };

  // Hide the icon only when the control keeps a name without it. A whitespace
  // aria-label, an unresolved or empty aria-labelledby, and a ripple, state
  // layer, or empty text wrapper are not that name. The author's svg string
  // is not rewritten (https://w3c.github.io/aria/#aria-hidden).
  const markIcon = (): void => {
    syncDecorativeIcon(element);
  };

  return {
    /**
     * Sets icon HTML content
     * @param html - Icon HTML content
     * @returns IconManager instance for chaining
     */
    setIcon(html: string): IconManager {
      if (!iconElement && html) {
        // Create new icon element
        iconElement = createIconElement(html);

        // Insert at the appropriate position
        if (config.iconPosition === "end") {
          element.appendChild(iconElement);
        } else {
          // For 'start' position, insert after any existing label. The label
          // class is built from the configured componentName and prefix,
          // which are data, not selector syntax: a quote or a backslash in
          // either made the interpolated `[class*=...]` selector throw.
          // getElementsByClassName compares the literal token, so every
          // name reaches its label.
          const labelElement = element.getElementsByClassName(
            `${PREFIX}-${config.componentName || "component"}__label`,
          )[0];
          if (labelElement) {
            // Insert after the label
            if (labelElement.nextSibling) {
              element.insertBefore(iconElement, labelElement.nextSibling);
            } else {
              element.appendChild(iconElement);
            }
          } else {
            // No label found, insert as first child
            element.insertBefore(iconElement, element.firstChild);
          }
        }
        markIcon();
      } else if (iconElement && html) {
        // Update existing icon
        setHTML(iconElement, html);
        markIcon();
      }
      return this;
    },

    /**
     * Gets current icon HTML content
     * @returns Current icon HTML
     */
    getIcon(): string {
      return iconElement ? iconElement.innerHTML : "";
    },

    /**
     * Gets icon element
     * @returns Icon element or null if not created
     */
    getElement(): HTMLElement | null {
      return iconElement;
    },
  };
};

/**
 * Adds icon management to a component
 *
 * @param config - Configuration object containing icon information
 * @returns Function that enhances a component with icon capabilities
 */
export const withIcon =
  <T extends IconConfig & object>(config: T) =>
  <C extends ElementComponent>(component: C): C & IconComponent => {
    // Create the icon with configuration settings
    const icon = createIcon(component.element, {
      prefix: config.prefix,
      componentName: config.componentName || "component",
      iconPosition: config.iconPosition,
      iconSize: config.iconSize,
    });

    // Set icon if provided in config
    if (config.icon) {
      icon.setIcon(config.icon);
    }

    // Apply button-specific styling for buttons with both icon and text
    if (component.componentName === "button" && config.icon && config.text) {
      component.element.classList.add(`${component.getClass("button")}--icon`);
    }

    // Return enhanced component with icon capabilities
    return {
      ...component,
      icon,
    };
  };

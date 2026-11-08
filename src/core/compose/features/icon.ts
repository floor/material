// src/core/compose/features/icon.ts

import { BaseComponent, ElementComponent } from "../component";

import { setHTML } from "../../dom/html";

/**
 * The icon span `withIcon` created for a host.
 * Keyed by the host, not found by class: a group button's `mtrl-button--icon`
 * class ends in `-icon` and is not the icon. Scanning for that class hid the
 * button, so a named icon item lost its accessible name.
 */
const icons = new WeakMap<HTMLElement, HTMLElement>();

/** The icon span this feature created for `host`, if it created one. */
export const decorativeIcon = (host: HTMLElement): HTMLElement | null => icons.get(host) ?? null;

/**
 * The name walk lives in `icon-decorate.ts`, which this module does not import.
 * Until that module registers, a factory icon is left as it was created, so
 * the createButton graph does not pay for the walk and default HTML is unchanged.
 */
let decorate: ((host: HTMLElement) => void) | null = null;

/** True once `enableDecorativeIcons` has registered in this bundle. */
export const decorativeIconsOn = (): boolean => decorate !== null;

/** Register the name walk. Called only from the opt-in module. */
export const registerDecorativeSync = (fn: (host: HTMLElement) => void): void => {
  decorate = fn;
};

/**
 * Hides the icon when the opt-in says the control still has a name without it.
 * A no-op until `enableDecorativeIcons` runs. Called after setIcon, setText,
 * and setAriaLabel. A custom element calls `syncSlottedIcon` for its slot.
 */
export const syncDecorativeIcon = (host: HTMLElement): void => {
  decorate?.(host);
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

  // The opt-in module decides. Until it loads, the icon stays as created.
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
        icons.set(element, iconElement);

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

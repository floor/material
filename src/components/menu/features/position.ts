// src/components/menu/features/position.ts

import { MenuConfig, MenuFeatureHost } from "../types";

/**
 * Menu position helper
 * Provides functions for positioning menus and submenus
 */
export const createPositioner = (
  component: MenuFeatureHost,
  config: MenuConfig,
) => {
  /**
   * Positions the menu relative to its opener
   * Ensures the menu maintains proper spacing from viewport edges
   * Makes sure the menu stays attached to opener during scrolling
   *
   * @param menuElement - The menu element to position
   * @param openerElement - The element to opener against
   * @param preferredPosition - The preferred position
   * @param isSubmenu - Whether this is a submenu (affects positioning logic)
   */
  /** The space kept between a menu and the viewport's top and bottom edges */
  const VIEWPORT_MARGIN = 48;
  /** A menu never shrinks below this to fit, so a few rows always show */
  const MIN_MENU_HEIGHT = 100;

  const positionElement = (
    menuElement: HTMLElement,
    openerElement: HTMLElement,
    preferredPosition: string,
    isSubmenu = false,
  ): void => {
    if (!menuElement || !openerElement) return;

    // [dir=rtl] does not cross a shadow boundary. The sheet also matches
    // menu--rtl, from the computed direction, which does. Set before
    // measuring: the mirror changes the submenu item's padding.
    menuElement.classList.toggle(
      component.getClass("menu--rtl"),
      getComputedStyle(menuElement).direction === "rtl",
    );

    // In the top layer the menu is fixed to the viewport: its coordinates are
    // the opener's client rect, with no scroll and no container offset
    const topLayer = config.layer === "top";
    const position = topLayer ? "fixed" : "absolute";

    // Check if menu is inside a container (not document.body)
    const hasContainer =
      !topLayer && config.container && config.container !== document.body;

    // Ensure menu is positioned absolutely for proper scroll behavior
    menuElement.style.position = position;

    // Get current scroll position - critical for absolute positioning that tracks opener
    // When inside a container, we position relative to the container, not the viewport
    const scrollX =
      hasContainer || topLayer
        ? 0
        : window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY =
      hasContainer || topLayer
        ? 0
        : window.pageYOffset || document.documentElement.scrollTop;

    // Get opener measurements first (needed for width calculation)
    const openerRect = openerElement.getBoundingClientRect();

    // Make a copy of the menu for measurement without affecting the real menu
    const tempMenu = menuElement.cloneNode(true) as HTMLElement;

    // Make the temp menu visible but not displayed for measurement
    tempMenu.style.visibility = "hidden";
    tempMenu.style.display = "block";
    tempMenu.style.position = position;
    tempMenu.style.top = "0";
    tempMenu.style.left = "0";
    tempMenu.style.transform = "none";
    tempMenu.style.opacity = "0";
    tempMenu.style.pointerEvents = "none";
    // Measured at the height it will have: without its max height a long
    // list measured as tall as every row, never "fit" below the opener,
    // flipped above it and was clamped to the top of the viewport.
    // Not the height a previous placement fitted it to: a menu
    // measured at that cap fits exactly and would lose it on the next pass.
    tempMenu.style.maxHeight = config.maxHeight ?? "";
    tempMenu.classList.add(`${component.getClass("menu--visible")}`); // Add visible class for proper dimensions

    // Apply width to temp menu BEFORE measuring if config specifies 100% width
    // This ensures we measure with the correct width on first open
    if (config.width === "100%" && !isSubmenu) {
      tempMenu.style.width = `${openerRect.width}px`;
    }

    // Add it to the DOM temporarily (use container if available for accurate measurement).
    // A top-layer menu is measured where it is, in its own tree, whose styles
    // may be a shadow root's.
    const measureContainer =
      (topLayer && menuElement.parentNode) || config.container || document.body;
    measureContainer.appendChild(tempMenu);

    // Get measurements
    const menuRect = tempMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Remove the temp element after measurements
    measureContainer.removeChild(tempMenu);

    // Get values needed for calculations
    const offset = config.offset !== undefined ? config.offset : 8;

    // Calculate position based on position
    let top = 0;
    let left = 0;
    let calculatedPosition = preferredPosition;

    // Different positioning logic for main menu vs submenu
    if (isSubmenu) {
      // Default position is to the right of parent
      calculatedPosition = preferredPosition || "right-start";

      // Check if this would push the submenu out of the viewport
      if (
        calculatedPosition.startsWith("right") &&
        openerRect.right + menuRect.width + offset > viewportWidth - 16
      ) {
        // Flip to the left side if it doesn't fit on the right
        calculatedPosition = calculatedPosition.replace("right", "left");
      } else if (
        calculatedPosition.startsWith("left") &&
        openerRect.left - menuRect.width - offset < 16
      ) {
        // Flip to the right side if it doesn't fit on the left
        calculatedPosition = calculatedPosition.replace("left", "right");
      }

      // Check vertical positioning as well for submenus
      // If submenu would extend beyond the bottom of the viewport, adjust positioning
      if (openerRect.top + menuRect.height > viewportHeight - 48) {
        if (calculatedPosition === "right-start") {
          calculatedPosition = "right-end";
        } else if (calculatedPosition === "left-start") {
          calculatedPosition = "left-end";
        }
      }
    } else {
      // For main menu, follow the standard position calculation
      // First determine correct position based on original position
      switch (preferredPosition) {
        case "top-start":
        case "top":
        case "top-end":
          // Check if enough space above
          if (openerRect.top < menuRect.height + offset + 48) {
            // Not enough space above, flip to bottom
            calculatedPosition = preferredPosition.replace("top", "bottom");
          }
          break;

        case "bottom-start":
        case "bottom":
        case "bottom-end":
          // Check if enough space below
          if (
            openerRect.bottom + menuRect.height + offset + 48 >
            viewportHeight
          ) {
            // Not enough space below, check if more space above
            if (openerRect.top > viewportHeight - openerRect.bottom) {
              // More space above, flip to top
              calculatedPosition = preferredPosition.replace("bottom", "top");
            }
          }
          break;

        // Specifically handle right-start, right, left-start, and left positions
        case "right-start":
        case "right":
        case "left-start":
        case "left":
          // Check if enough space below for these side positions
          if (openerRect.bottom + menuRect.height > viewportHeight - 48) {
            // Not enough space below, shift the menu upward
            if (preferredPosition === "right-start") {
              calculatedPosition = "right-end";
            } else if (preferredPosition === "left-start") {
              calculatedPosition = "left-end";
            } else if (preferredPosition === "right") {
              // For center aligned, shift up by half menu height plus some spacing
              top =
                openerRect.top - (menuRect.height - openerRect.height) - offset;
            } else if (preferredPosition === "left") {
              // For center aligned, shift up by half menu height plus some spacing
              top =
                openerRect.top - (menuRect.height - openerRect.height) - offset;
            }
          }
          break;
      }
    }

    // The menu's height, capped to the room on its side of the anchor, so a
    // long list scrolls inside the viewport wherever the menu is mounted: the
    // body, a container or the top layer. For a main menu above or
    // below its anchor; one beside it and submenus keep their own rules.
    let height = menuRect.height;
    let fitted: number | null = null;
    if (!isSubmenu && /^(top|bottom)/.test(calculatedPosition)) {
      const below = viewportHeight - openerRect.bottom - offset - VIEWPORT_MARGIN;
      const above = openerRect.top - offset - VIEWPORT_MARGIN;
      // Where the list fits on neither side, the side with more room
      if (height > (calculatedPosition.startsWith("bottom") ? below : above)) {
        calculatedPosition = calculatedPosition.replace(/^(top|bottom)/, below >= above ? "bottom" : "top");
      }
      const room = Math.max(calculatedPosition.startsWith("bottom") ? below : above, MIN_MENU_HEIGHT);
      if (height > room) {
        fitted = room;
        height = room;
      }
    }
    // The fitted height, else the configured one; none left over from a
    // previous placement where it no longer applies
    menuElement.style.maxHeight = fitted !== null ? `${fitted}px` : (config.maxHeight ?? "");

    // A menu wider than its opener, placed at the start, keeps the opener's
    // left in both directions. Right-to-left, that edge is the right. Only
    // when the menu is wider, so a menu as wide as its field stays put, and
    // not a submenu, which has its own side.
    if (
      !isSubmenu &&
      menuRect.width > openerRect.width &&
      (calculatedPosition === "top-start" || calculatedPosition === "bottom-start") &&
      getComputedStyle(openerElement).direction === "rtl"
    ) calculatedPosition = calculatedPosition.replace("start", "end");

    // Reset any existing position classes
    const positionClasses = [
      "position-top",
      "position-bottom",
      "position-right",
      "position-left",
    ];

    positionClasses.forEach((posClass) => {
      menuElement.classList.remove(
        `${component.getClass("menu")}--${posClass}`,
      );
    });

    // Determine transform origin based on vertical position
    // Start by checking the calculated position to determine transform origin
    const menuAppearsAboveOpener =
      calculatedPosition.startsWith("top") ||
      calculatedPosition === "right-end" ||
      calculatedPosition === "left-end" ||
      (calculatedPosition === "right" && top < openerRect.top) ||
      (calculatedPosition === "left" && top < openerRect.top);

    if (menuAppearsAboveOpener) {
      menuElement.classList.add(`${component.getClass("menu")}--position-top`);
    } else if (calculatedPosition.startsWith("left")) {
      menuElement.classList.add(`${component.getClass("menu")}--position-left`);
    } else if (calculatedPosition.startsWith("right")) {
      menuElement.classList.add(
        `${component.getClass("menu")}--position-right`,
      );
    } else {
      menuElement.classList.add(
        `${component.getClass("menu")}--position-bottom`,
      );
    }

    // Position calculation - important: getBoundingClientRect() returns values relative to viewport
    // We need to add scroll position to get absolute position (unless we have a container)
    // When inside a container, position relative to the container
    const containerRect =
      hasContainer && config.container
        ? config.container.getBoundingClientRect()
        : { top: 0, left: 0, right: 0, bottom: 0 };

    // Calculate offsets - when in a container, subtract container position
    const offsetX = hasContainer ? -containerRect.left : scrollX;
    const offsetY = hasContainer ? -containerRect.top : scrollY;

    switch (calculatedPosition) {
      case "top-start":
        top = openerRect.top + offsetY - height - offset;
        left = openerRect.left + offsetX;
        break;
      case "top":
        top = openerRect.top + offsetY - height - offset;
        left =
          openerRect.left + offsetX + openerRect.width / 2 - menuRect.width / 2;
        break;
      case "top-end":
        top = openerRect.top + offsetY - height - offset;
        left = openerRect.right + offsetX - menuRect.width;
        break;
      case "right-start":
        top = openerRect.top + offsetY;
        left = openerRect.right + offsetX + offset;
        break;
      case "right":
        // Custom top position might be set above; only set if not already defined
        if (top === 0) {
          top =
            openerRect.top +
            offsetY +
            openerRect.height / 2 -
            height / 2;
        } else {
          top += offsetY;
        }
        left = openerRect.right + offsetX + offset;
        break;
      case "right-end":
        top = openerRect.bottom + offsetY - height;
        left = openerRect.right + offsetX + offset;
        break;
      case "bottom-start":
        top = openerRect.bottom + offsetY + offset;
        left = openerRect.left + offsetX;
        break;
      case "bottom":
        top = openerRect.bottom + offsetY + offset;
        left =
          openerRect.left + offsetX + openerRect.width / 2 - menuRect.width / 2;
        break;
      case "bottom-end":
        top = openerRect.bottom + offsetY + offset;
        left = openerRect.right + offsetX - menuRect.width;
        break;
      case "left-start":
        top = openerRect.top + offsetY;
        left = openerRect.left + offsetX - menuRect.width - offset;
        break;
      case "left":
        // Custom top position might be set above; only set if not already defined
        if (top === 0) {
          top =
            openerRect.top +
            offsetY +
            openerRect.height / 2 -
            height / 2;
        } else {
          top += offsetY;
        }
        left = openerRect.left + offsetX - menuRect.width - offset;
        break;
      case "left-end":
        top = openerRect.bottom + offsetY - height;
        left = openerRect.left + offsetX - menuRect.width - offset;
        break;
    }

    // Ensure the menu has proper spacing from viewport edges
    // Skip viewport edge checks when inside a container
    if (hasContainer) {
      // For container-based positioning, just apply the calculated positions
      menuElement.style.top = `${top}px`;
      menuElement.style.left = `${left}px`;

      // For 'width: 100%' configuration, match the opener width
      if (config.width === "100%" && !isSubmenu) {
        menuElement.style.width = `${openerRect.width}px`;
      }

      return; // Exit early for container-based menus
    }

    // Top edge spacing - ensure the menu doesn't go above the viewport + padding
    const minTopSpacing = 48; // Minimum distance from top of viewport
    if (top - scrollY < minTopSpacing) {
      top = minTopSpacing + scrollY;
    }

    // A side menu or a submenu running past the bottom shrinks to fit;
    // a menu above or below its anchor was fitted before it was placed
    const bottomEdge = top - scrollY + height;
    if (fitted === null && bottomEdge > viewportHeight - VIEWPORT_MARGIN) {
      const available = viewportHeight - (top - scrollY) - VIEWPORT_MARGIN;
      const shrunk = Math.max(available, Math.min(height, MIN_MENU_HEIGHT));
      const configured = config.maxHeight ? parseInt(config.maxHeight, 10) : NaN;
      menuElement.style.maxHeight = `${Number.isNaN(configured) ? shrunk : Math.min(shrunk, configured)}px`;
    }

    // For 'width: 100%' configuration, match the opener width
    if (config.width === "100%" && !isSubmenu) {
      menuElement.style.width = `${openerRect.width}px`;
    }

    // Apply final positions, ensuring menu stays within viewport
    // The position is absolute, not fixed, so it must account for scroll
    const finalTop = Math.max(minTopSpacing + scrollY, top);
    const finalLeft = Math.max(16 + scrollX, left);

    menuElement.style.top = `${finalTop}px`;
    menuElement.style.left = `${finalLeft}px`;

    // Make sure menu doesn't extend past right edge
    if (finalLeft - scrollX + menuRect.width > viewportWidth - 16) {
      // If we're going past the right edge, set right with fixed distance from edge
      menuElement.style.left = "auto";
      menuElement.style.right = "16px";
    }
  };

  /**
   * Positions the main menu relative to its opener
   */
  const positionMenu = (openerElement: HTMLElement): void => {
    if (!openerElement || !component.element) return;
    positionElement(component.element, config.positionTarget ?? openerElement, config.position ?? "bottom-start", false);
  };

  /**
   * Positions a submenu relative to its parent menu item
   * For deeply nested submenus, alternates side placement (right/left)
   * @param submenuElement - The submenu element to position
   * @param parentItemElement - The parent menu item element
   * @param level - Nesting level for calculating position
   */
  const positionSubmenu = (
    submenuElement: HTMLElement,
    parentItemElement: HTMLElement,
    level: number = 1,
  ): void => {
    if (!submenuElement || !parentItemElement) return;

    // Alternate between right and left positioning for deeper nesting levels
    // This helps prevent menus from cascading off the screen
    const prefPosition = level % 2 === 1 ? "right-start" : "left-start";

    // Use higher z-index for deeper nested menus to ensure proper layering
    submenuElement.style.zIndex = `${1000 + level * 10}`;

    positionElement(submenuElement, parentItemElement, prefPosition, true);
  };

  return {
    positionMenu,
    positionSubmenu,
    positionElement,
  };
};

/**
 * Adds positioning functionality to the menu component
 *
 * @param config - Menu configuration options
 * @returns Component enhancer with positioning functionality
 */
const withPosition =
  (config: MenuConfig) =>
  // Generic, so the accumulated pipeline type survives (see #109).
  <C extends MenuFeatureHost>(component: C) => {
  // Do nothing if no element
  if (!component.element) {
    return component;
  }

  // Create the positioner
  const positioner = createPositioner(component, config);

  // Return enhanced component
  return {
    ...component,
    position: positioner,
  };
};

export default withPosition;

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

    // Every rect read below is in visual pixels and every length written
    // below is in the menu's own layout pixels, which render scaled again by
    // the zoom the menu sits under. Convert the reads into that frame once,
    // the frame the writes are in: 1 for a menu in the page (or the top
    // layer), the menu's cumulative zoom for one mounted in a scaled
    // container. Without it a scaled menu writes the opener's visual width
    // and lands half the distance under it. Read here rather than through
    // `effectiveZoom` (core/dom): the import costs the menu's bundles tens of
    // gzipped bytes each, and the split button's budget has none to give
    // (scripts/size.ts). The ripple reads it the same way.
    const zoom = menuElement.currentCSSZoom || 1;

    // Get opener measurements first (needed for width calculation): its edges
    // in that frame, then its border-box size the way the menu's own is read —
    // offsetWidth/offsetHeight already answer in it, with no rectangles to
    // build (jsdom, where the unit suite positions menus, has no DOMRect).
    const visualRect = openerElement.getBoundingClientRect();
    const rectTop = visualRect.top / zoom;
    const rectBottom = visualRect.bottom / zoom;
    const rectLeft = visualRect.left / zoom;
    const rectRight = visualRect.right / zoom;
    const rectWidth = openerElement.offsetWidth;
    const rectHeight = openerElement.offsetHeight;

    // Make a copy of the menu for measurement without affecting the real menu
    const tempMenu = menuElement.cloneNode(true) as HTMLElement;

    // Make the temp menu visible but not displayed for measurement
    Object.assign(tempMenu.style, {
      visibility: "hidden",
      display: "block",
      position,
      top: "0",
      left: "0",
      transform: "none",
      opacity: "0",
      pointerEvents: "none",
    });
    // Measured at the height it will have: without its max height a long
    // list measured as tall as every row, never "fit" below the opener,
    // flipped above it and was clamped to the top of the viewport.
    // Not the height a previous placement fitted it to: a menu
    // measured at that cap fits exactly and would lose it on the next pass.
    tempMenu.style.maxHeight = config.maxHeight ?? "";
    tempMenu.classList.add(`${component.getClass("menu--visible")}`); // Add visible class for proper dimensions

    // Apply width to temp menu BEFORE measuring if config specifies 100% width
    // This ensures we measure with the correct width on first open
    const fitField = config.width === "100%" && !isSubmenu;
    if (fitField) {
      tempMenu.style.width = `${rectWidth}px`;
    }

    // Add it to the DOM temporarily (use container if available for accurate measurement).
    // A top-layer menu is measured where it is, in its own tree, whose styles
    // may be a shadow root's.
    const measureContainer =
      (topLayer && menuElement.parentNode) || config.container || document.body;
    measureContainer.appendChild(tempMenu);

    // Get measurements. The menu's own size is read in its own pixels:
    // offsetWidth/offsetHeight already answer unscaled, the frame its lengths
    // are written in, where a rect is visual and needs the zoom divided out
    // (the opener's below does, and the container's, which may sit elsewhere).
    const menuWidth = tempMenu.offsetWidth;
    const menuHeight = tempMenu.offsetHeight;
    const viewportWidth = window.innerWidth / zoom;
    const viewportHeight = window.innerHeight / zoom;

    // Remove the temp element after measurements
    measureContainer.removeChild(tempMenu);

    // A 'width: 100%' menu matches the opener's width: set once here, where
    // both the container placement below and the page one pass
    if (fitField) menuElement.style.width = `${rectWidth}px`;

    // Get values needed for calculations
    const offset = config.offset ?? 8;

    // Calculate position based on position
    let top = 0;
    let left = 0;
    let calculatedPosition = preferredPosition;

    // Different positioning logic for main menu vs submenu
    if (isSubmenu) {
      // Default position is to the right of parent
      calculatedPosition = preferredPosition || "right-start";

      // Check if this would push the submenu out of the viewport, and flip it
      // to the other side if it would
      const opensRight = calculatedPosition.startsWith("right");
      if (
        opensRight
          ? rectRight + menuWidth + offset > viewportWidth - 16
          : rectLeft - menuWidth - offset < 16
      ) {
        calculatedPosition = calculatedPosition.replace(
          opensRight ? "right" : "left",
          opensRight ? "left" : "right",
        );
      }

      // Check vertical positioning as well for submenus
      // If submenu would extend beyond the bottom of the viewport, adjust positioning
      if (rectTop + menuHeight > viewportHeight - 48) {
        // A side-aligned submenu whose start edge runs past the bottom flips
        // to its end edge; the guard is what "start"/"end" name here
        if (
          calculatedPosition.startsWith("right") ||
          calculatedPosition.startsWith("left")
        ) {
          calculatedPosition = calculatedPosition.replace("start", "end");
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
          if (rectTop < menuHeight + offset + 48) {
            // Not enough space above, flip to bottom
            calculatedPosition = preferredPosition.replace("top", "bottom");
          }
          break;

        case "bottom-start":
        case "bottom":
        case "bottom-end":
          // Not enough space below, and more space above: flip to top
          if (
            rectBottom + menuHeight + offset + 48 > viewportHeight &&
            rectTop > viewportHeight - rectBottom
          ) {
            calculatedPosition = preferredPosition.replace("bottom", "top");
          }
          break;

        // Specifically handle right-start, right, left-start, and left positions
        case "right-start":
        case "right":
        case "left-start":
        case "left":
          // Check if enough space below for these side positions
          if (rectBottom + menuHeight > viewportHeight - 48) {
            // Not enough space below, shift the menu upward
            if (preferredPosition === "right-start") {
              calculatedPosition = "right-end";
            } else if (preferredPosition === "left-start") {
              calculatedPosition = "left-end";
            } else {
              // The two centre-aligned sides, the only others the case list
              // above lets through: shift up by half the menu height plus
              // some spacing
              top =
                rectTop - (menuHeight - rectHeight) - offset;
            }
          }
          break;
      }
    }

    // The menu's height, capped to the room on its side of the anchor, so a
    // long list scrolls inside the viewport wherever the menu is mounted: the
    // body, a container or the top layer. For a main menu above or
    // below its anchor; one beside it and submenus keep their own rules.
    let height = menuHeight;
    let fitted: number | null = null;
    if (!isSubmenu && /^(top|bottom)/.test(calculatedPosition)) {
      const below = viewportHeight - rectBottom - offset - VIEWPORT_MARGIN;
      const above = rectTop - offset - VIEWPORT_MARGIN;
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
    menuElement.style.maxHeight = fitted ? `${fitted}px` : (config.maxHeight ?? "");

    // A menu wider than its opener, placed at the start, keeps the opener's
    // left in both directions. Right-to-left, that edge is the right. Only
    // when the menu is wider, so a menu as wide as its field stays put, and
    // not a submenu, which has its own side.
    if (
      !isSubmenu &&
      menuWidth > rectWidth &&
      (calculatedPosition === "top-start" || calculatedPosition === "bottom-start") &&
      getComputedStyle(openerElement).direction === "rtl"
    ) calculatedPosition = calculatedPosition.replace("start", "end");

    // Determine transform origin based on vertical position
    // Start by checking the calculated position to determine transform origin
    const menuAppearsAboveOpener =
      calculatedPosition.startsWith("top") ||
      calculatedPosition === "right-end" ||
      calculatedPosition === "left-end" ||
      ((calculatedPosition === "right" || calculatedPosition === "left") &&
        top < rectTop);

    // The matching class of the four, and only it: one pass sets it and
    // clears whatever a previous placement left, instead of a reset pass
    const side = menuAppearsAboveOpener
      ? "top"
      : calculatedPosition.startsWith("left")
        ? "left"
        : calculatedPosition.startsWith("right")
          ? "right"
          : "bottom";
    for (const posClass of ["top", "bottom", "right", "left"]) {
      menuElement.classList.toggle(
        `${component.getClass("menu")}--position-${posClass}`,
        posClass === side,
      );
    }

    // Position calculation - important: getBoundingClientRect() returns values relative to viewport
    // We need to add scroll position to get absolute position (unless we have a container)
    // When inside a container, position relative to the container: only its
    // position is needed, and like the opener's rect it is visual, so its
    // edges are divided by the zoom the menu's lengths are written in
    const offsetX = hasContainer
      ? -config.container!.getBoundingClientRect().left / zoom
      : scrollX;
    const offsetY = hasContainer
      ? -config.container!.getBoundingClientRect().top / zoom
      : scrollY;

    // The opener's edges with those offsets applied, once each: every case
    // below anchors a side or a corner to one of them
    const openerTop = rectTop + offsetY;
    const openerBottom = rectBottom + offsetY;
    const openerLeft = rectLeft + offsetX;
    const openerRight = rectRight + offsetX;

    switch (calculatedPosition) {
      case "top-start":
        top = openerTop - height - offset;
        left = openerLeft;
        break;
      case "top":
        top = openerTop - height - offset;
        left = openerLeft + rectWidth / 2 - menuWidth / 2;
        break;
      case "top-end":
        top = openerTop - height - offset;
        left = openerRight - menuWidth;
        break;
      case "right-start":
        top = openerTop;
        left = openerRight + offset;
        break;
      case "right":
        // Custom top position might be set above; only set if not already defined
        if (top === 0) {
          top = openerTop + rectHeight / 2 - height / 2;
        } else {
          top += offsetY;
        }
        left = openerRight + offset;
        break;
      case "right-end":
        top = openerBottom - height;
        left = openerRight + offset;
        break;
      case "bottom-start":
        top = openerBottom + offset;
        left = openerLeft;
        break;
      case "bottom":
        top = openerBottom + offset;
        left = openerLeft + rectWidth / 2 - menuWidth / 2;
        break;
      case "bottom-end":
        top = openerBottom + offset;
        left = openerRight - menuWidth;
        break;
      case "left-start":
        top = openerTop;
        left = openerLeft - menuWidth - offset;
        break;
      case "left":
        // Custom top position might be set above; only set if not already defined
        if (top === 0) {
          top = openerTop + rectHeight / 2 - height / 2;
        } else {
          top += offsetY;
        }
        left = openerLeft - menuWidth - offset;
        break;
      case "left-end":
        top = openerBottom - height;
        left = openerLeft - menuWidth - offset;
        break;
    }

    // Ensure the menu has proper spacing from viewport edges
    // Skip viewport edge checks when inside a container
    if (hasContainer) {
      // For container-based positioning, just apply the calculated positions
      menuElement.style.top = `${top}px`;
      menuElement.style.left = `${left}px`;

      return; // Exit early for container-based menus
    }

    // Ensure the menu has proper spacing from viewport edges: the top edge
    // keeps 48 (the minimum distance from the top of the viewport), the left
    // the 16 of the right-edge check below. The position is absolute, not
    // fixed, so both account for scroll.
    top = Math.max(48 + scrollY, top);
    left = Math.max(16 + scrollX, left);

    // A side menu or a submenu running past the bottom shrinks to fit;
    // a menu above or below its anchor was fitted before it was placed
    const bottomEdge = top - scrollY + height;
    if (!fitted && bottomEdge > viewportHeight - VIEWPORT_MARGIN) {
      const available = viewportHeight - (top - scrollY) - VIEWPORT_MARGIN;
      const shrunk = Math.max(available, Math.min(height, MIN_MENU_HEIGHT));
      const configured = config.maxHeight ? parseInt(config.maxHeight, 10) : NaN;
      menuElement.style.maxHeight = `${Number.isNaN(configured) ? shrunk : Math.min(shrunk, configured)}px`;
    }

    menuElement.style.top = `${top}px`;
    menuElement.style.left = `${left}px`;

    // Make sure menu doesn't extend past right edge
    if (left - scrollX + menuWidth > viewportWidth - 16) {
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

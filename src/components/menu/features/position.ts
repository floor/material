// src/components/menu/features/position.ts

import { fitVertically } from "../../../core/dom/placement";
import { effectiveZoom } from "../../../core/dom/zoom";
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
    // One division for every rect value written as a local style below.
    const zoom = effectiveZoom(openerElement);
    // A submenu aligns vertically with the item that opened it and horizontally
    // with the menu surface that item sits in, so the vertical menu's 4dp
    // inline container padding does not pull the submenu 4dp inside the parent.
    const parentMenu = isSubmenu
      ? openerElement.closest<HTMLElement>(`.${component.getClass("menu")}`)
      : null;
    const rawParentMenuRect = parentMenu ? parentMenu.getBoundingClientRect() : null;
    const horizontalRect =
      rawParentMenuRect && rawParentMenuRect.width >= openerRect.width
        ? rawParentMenuRect
        : openerRect;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // A container's scrollport in the viewport's pixels: its client box (inside
    // the border and the scrollbars) at the container's own zoom. A rect is the
    // border box, so a bordered scroller would otherwise count its border as
    // room. The menu is written in this scrollport's local space, and every
    // viewport value is converted once, in that same space.
    let portTop = 0;
    let portLeft = 0;
    let containerZoom = zoom;
    let limitTop = 0;
    let limitBottom = viewportHeight;
    let containerClips = false;
    if (hasContainer && config.container) {
      const overflow = getComputedStyle(config.container);
      containerClips = [overflow.overflow, overflow.overflowX, overflow.overflowY]
        .some((value) => value !== "visible");
      const port = config.container.getBoundingClientRect();
      containerZoom = effectiveZoom(config.container);
      portTop = port.top + config.container.clientTop * containerZoom;
      portLeft = port.left + config.container.clientLeft * containerZoom;
      if (containerClips) {
        const portBottom = portTop + config.container.clientHeight * containerZoom;
        limitTop = Math.max(limitTop, portTop);
        limitBottom = Math.min(limitBottom, portBottom);
      }
    }
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
      // The clone is measured in the zoomed subtree: its width is the opener's
      // rect width divided back to local pixels, or the menu is zoom-times too
      // wide at 0.7 and 0.5.
      tempMenu.style.width = `${openerRect.width / (hasContainer ? containerZoom : zoom)}px`;
    }

    // Add it to the DOM temporarily (use container if available for accurate measurement).
    // A top-layer menu is measured where it is, in its own tree, whose styles
    // may be a shadow root's.
    const measureContainer =
      (topLayer && menuElement.parentNode) || config.container || document.body;
    measureContainer.appendChild(tempMenu);

    // Get measurements
    const menuRect = tempMenu.getBoundingClientRect();

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

      // Check if this would push the submenu out of the viewport. With
      // autoFlip: false the submenu keeps the side it was asked for.
      if (
        config.autoFlip !== false &&
        calculatedPosition.startsWith("right") &&
        horizontalRect.right + menuRect.width + offset > viewportWidth - 16
      ) {
        // Flip to the left side if it doesn't fit on the right
        calculatedPosition = calculatedPosition.replace("right", "left");
      } else if (
        config.autoFlip !== false &&
        calculatedPosition.startsWith("left") &&
        horizontalRect.left - menuRect.width - offset < 16
      ) {
        // Flip to the right side if it doesn't fit on the left
        calculatedPosition = calculatedPosition.replace("left", "right");
      }

      // Check vertical positioning as well for submenus
      // If submenu would extend beyond the bottom of the viewport, adjust
      // positioning; autoFlip: false keeps the start alignment.
      if (config.autoFlip !== false && openerRect.top + menuRect.height > viewportHeight - 48) {
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
        // top* and bottom* are decided below, once, by the shared vertical
        // rule (core/dom/placement): preferred side while the list fits,
        // otherwise the side with more room, then a capped height.

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

    // The menu's height and side, from the shared vertical rule
    // (core/dom/placement) with this component's margin and minimum: the
    // preferred side while the list fits there, otherwise the side with more
    // room — or, with autoFlip: false, still the preferred side — then a cap,
    // so a long list scrolls inside the viewport wherever the menu is mounted:
    // the body, a container or the top layer. One beside its anchor and
    // submenus keep their own rules.
    let height = menuRect.height;
    let fitted: number | null = null;
    // A length the page states in the container's own pixels, in the
    // viewport's: the offset and the margin both belong to the local space.
    const placeZoom = hasContainer ? containerZoom : zoom;
    const placeOffset = hasContainer ? offset * placeZoom : offset;
    const placeMargin = hasContainer ? VIEWPORT_MARGIN * placeZoom : VIEWPORT_MARGIN;
    if (!isSubmenu && /^(top|bottom)/.test(calculatedPosition)) {
      // The room a menu can use is the part of the window it can be seen in:
      // the viewport, and, in an explicit container that clips, only the part
      // of the container's scrollport that is also in the viewport. Choosing
      // a side from the viewport alone put the menu where the container cut
      // it — an item focused afterwards scrolled the container to reveal it,
      // which dragged the menu over its opener. A container that does not
      // clip (overflow visible) limits nothing of its own, and a body or
      // top-layer menu keeps the viewport alone.
      const below = limitBottom - openerRect.bottom - placeOffset - placeMargin;
      const above = openerRect.top - limitTop - placeOffset - placeMargin;
      const fit = fitVertically({
        preferred: calculatedPosition.startsWith("top") ? "top" : "bottom",
        height,
        above,
        below,
        minHeight: MIN_MENU_HEIGHT,
        autoFlip: config.autoFlip !== false,
      });
      calculatedPosition = calculatedPosition.replace(/^(top|bottom)/, fit.side);
      if (fit.maxHeight !== null) {
        fitted = fit.maxHeight;
        height = fit.maxHeight;
      }
    }
    // The fitted height, else the configured one; none left over from a
    // previous placement where it no longer applies. A container's cap is in
    // its own pixels.
    const capLocal = fitted !== null && hasContainer ? fitted / containerZoom : fitted;
    menuElement.style.maxHeight = capLocal !== null ? `${capLocal}px` : (config.maxHeight ?? "");

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

    // The menu is written in its offsetParent's space while a rect is in the
    // viewport's. A positioned host away from the origin (or an RTL page whose
    // zoom right-aligns the body) puts that space elsewhere, so the host's own
    // origin comes out before the value is written; the document's origin is
    // the viewport's minus the scroll. A container keeps its own rule below.
    const contextElement = menuElement.offsetParent as HTMLElement | null;
    const inDocumentSpace =
      !contextElement || contextElement === document.body || contextElement === document.documentElement;
    const contextRect = inDocumentSpace ? null : contextElement!.getBoundingClientRect();
    // A positioned host's scrollport: its client box (inside its border and
    // scrollbars) at its own zoom, with its own scroll moved out and back in
    // one place. A host at another origin with a border, or scrolled, is the
    // case a bare offsetParent subtraction got wrong.
    const contextZoom = contextRect ? effectiveZoom(contextElement!) : zoom;
    const contextPortTop = contextRect ? contextRect.top + contextElement!.clientTop * contextZoom : 0;
    const contextPortLeft = contextRect ? contextRect.left + contextElement!.clientLeft * contextZoom : 0;
    const contextLocalTop = (viewport: number): number =>
      contextRect ? (viewport - contextPortTop) / contextZoom + contextElement!.scrollTop : viewport + scrollY;
    const contextLocalLeft = (viewport: number): number =>
      contextRect ? (viewport - contextPortLeft) / contextZoom + contextElement!.scrollLeft : viewport + scrollX;
    // Viewport <-> write space, for the clamps that live in viewport pixels.
    const toViewportTop = (value: number): number => (contextRect ? value : value - scrollY);
    const fromViewportTop = (value: number): number => (contextRect ? value : value + scrollY);
    const toViewportLeft = (value: number): number => (contextRect ? value : value - scrollX);
    const fromViewportLeft = (value: number): number => (contextRect ? value : value + scrollX);

    // When in a container, map the opener's viewport rect back into the
    // container's content space: subtract the container's edge and add its own
    // scroll, which moved the content under that edge (a menu written without
    // it landed a scroll's worth above the opener — at scrollTop 120 on a
    // 120 px scroll, 120 px too high).
    // A container's switch runs in the viewport's pixels and is converted
    // once, below, into the scrollport's local space.
    // A container's and a positioned host's switch run in the viewport's
    // pixels; both are converted once at the write, below.
    const offsetX = hasContainer || contextRect ? 0 : scrollX;
    const offsetY = hasContainer || contextRect ? 0 : scrollY;

    switch (calculatedPosition) {
      case "top-start":
        top = openerRect.top + offsetY - height - placeOffset;
        left = openerRect.left + offsetX;
        break;
      case "top":
        top = openerRect.top + offsetY - height - placeOffset;
        left =
          openerRect.left + offsetX + openerRect.width / 2 - menuRect.width / 2;
        break;
      case "top-end":
        top = openerRect.top + offsetY - height - placeOffset;
        left = openerRect.right + offsetX - menuRect.width;
        break;
      case "right-start":
        top = openerRect.top + offsetY;
        left = horizontalRect.right + offsetX + placeOffset;
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
        left = horizontalRect.right + offsetX + placeOffset;
        break;
      case "right-end":
        top = openerRect.bottom + offsetY - height;
        left = horizontalRect.right + offsetX + placeOffset;
        break;
      case "bottom-start":
        top = openerRect.bottom + offsetY + placeOffset;
        left = openerRect.left + offsetX;
        break;
      case "bottom":
        top = openerRect.bottom + offsetY + placeOffset;
        left =
          openerRect.left + offsetX + openerRect.width / 2 - menuRect.width / 2;
        break;
      case "bottom-end":
        top = openerRect.bottom + offsetY + placeOffset;
        left = openerRect.right + offsetX - menuRect.width;
        break;
      case "left-start":
        top = openerRect.top + offsetY;
        left = horizontalRect.left + offsetX - menuRect.width - placeOffset;
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
        left = horizontalRect.left + offsetX - menuRect.width - placeOffset;
        break;
      case "left-end":
        top = openerRect.bottom + offsetY - height;
        left = horizontalRect.left + offsetX - menuRect.width - placeOffset;
        break;
    }

    // Ensure the menu has proper spacing from viewport edges
    // Skip viewport edge checks when inside a container
    if (hasContainer) {
      // The switch computed the position in the viewport's pixels; the menu is
      // written in the container's scrollport local space: inside its border,
      // divided by the container's zoom, and moved by the container's own
      // scroll. One conversion, in one space.
      const toLocalY = (value: number) => (value - portTop) / containerZoom + (config.container?.scrollTop ?? 0);
      const toLocalX = (value: number) => (value - portLeft) / containerZoom + (config.container?.scrollLeft ?? 0);
      menuElement.style.top = `${toLocalY(top)}px`;
      menuElement.style.left = `${toLocalX(left)}px`;

      // For 'width: 100%' configuration, match the opener width
      if (config.width === "100%" && !isSubmenu) {
        menuElement.style.width = `${openerRect.width / containerZoom}px`;
      }

      return; // Exit early for container-based menus
    }

    // Top edge spacing - ensure the menu doesn't go above the viewport + padding
    const minTopSpacing = 48; // Minimum distance from top of viewport
    if (toViewportTop(top) < minTopSpacing) {
      top = fromViewportTop(minTopSpacing);
    }

    // A side menu or a submenu running past the bottom shrinks to fit;
    // a menu above or below its anchor was fitted before it was placed
    const bottomEdge = toViewportTop(top) + height;
    if (fitted === null && bottomEdge > viewportHeight - VIEWPORT_MARGIN) {
      const available = viewportHeight - toViewportTop(top) - VIEWPORT_MARGIN;
      const shrunk = Math.max(available, Math.min(height, MIN_MENU_HEIGHT));
      const configured = config.maxHeight ? parseInt(config.maxHeight, 10) : NaN;
      menuElement.style.maxHeight = `${Number.isNaN(configured) ? shrunk : Math.min(shrunk, configured)}px`;
    }

    // For 'width: 100%' configuration, match the opener width
    if (config.width === "100%" && !isSubmenu) {
      menuElement.style.width = `${openerRect.width / (contextRect ? contextZoom : zoom)}px`;
    }

    // Apply final positions, ensuring menu stays within viewport
    // The position is absolute, not fixed, so it must account for scroll
    const finalTop = Math.max(fromViewportTop(minTopSpacing), top);
    const finalLeft = Math.max(fromViewportLeft(16), left);

    menuElement.style.top = contextRect ? `${contextLocalTop(finalTop)}px` : `${finalTop / zoom}px`;
    menuElement.style.left = contextRect ? `${contextLocalLeft(finalLeft)}px` : `${finalLeft / zoom}px`;

    // Make sure menu doesn't extend past right edge
    if (toViewportLeft(finalLeft) + menuRect.width > viewportWidth - 16) {
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

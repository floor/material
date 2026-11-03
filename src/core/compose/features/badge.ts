// src/core/compose/features/badge.ts

import { BaseComponent, ElementComponent } from '../component';
import type { BadgeComponent as Badge } from '../../../components/badge/types';
import createBadge from '../../../components/badge';
import { PREFIX } from '../../config';

/**
 * Configuration for badge feature
 */
export interface BadgeConfig {
  /**
   * Badge content to display
   */
  badge?: string | number;
  
  /**
   * Custom badge configuration
   */
  badgeConfig?: {
    variant?: string;
    color?: string;
    size?: string;
    position?: string;
    max?: number;
  };
  
  /**
   * CSS class prefix
   */
  prefix?: string;
}

/**
 * Component with badge capabilities
 */
export interface BadgeComponent extends BaseComponent {
  /**
   * Badge component instance
   */
  badge?: Badge;
}

/**
 * Adds one id to a space-separated id list attribute, keeping the ids already
 * there -- the item may already be described by something else.
 */
const addIdRef = (element: HTMLElement, attribute: string, id: string): void => {
  const ids = (element.getAttribute(attribute) ?? "").split(/\s+/).filter(Boolean);
  if (!ids.includes(id)) ids.push(id);
  element.setAttribute(attribute, ids.join(" "));
};

/** Removes one id from a space-separated id list attribute, leaving the rest. */
const removeIdRef = (element: HTMLElement, attribute: string, id: string): void => {
  const ids = (element.getAttribute(attribute) ?? "").split(/\s+/).filter((value) => value && value !== id);
  if (ids.length) element.setAttribute(attribute, ids.join(" "));
  else element.removeAttribute(attribute);
};

/** Ids for the badges this feature attaches, so their item can describe them. */
let nextBadgeId = 0;

/**
 * Adds badge functionality to a component
 * Creates and configures a badge component attached to the main component
 *
 * @param {BadgeConfig} config - Badge configuration
 * @returns {Function} Component enhancer with badge functionality
 */
// `& object` lets a component config that shares no key with BadgeConfig through.
export const withBadge = <T extends BadgeConfig & object>(config: T) =>
  <C extends ElementComponent>(component: C): C & BadgeComponent => {
    // Only create badge if content is provided
    if (config.badge === undefined) {
      return component as C & BadgeComponent;
    }

    // Create badge configuration
    const badgeConfig = {
      label: config.badge,
      standalone: false,
      target: component.element,
      ...config.badgeConfig || {},
      // Default to top-right position if not specified
      position: config.badgeConfig?.position || 'top-right',
      // Set prefix to match parent component
      prefix: config.prefix || PREFIX
    };

    // Create badge component
    const badge = createBadge(badgeConfig);

    // The item reads its badge after its own name: "The accessibility label
    // for a badge item will be read after its navigation destination. Any
    // numerical badges will have their number read, while non-counting badges
    // will simply announce New notification" (m3.material.io/components/
    // badges/accessibility, read 2026-11-01). A description does that without
    // touching the item's name. Only what the badge shows describes the item:
    // an empty or zero label hides a large badge -- whose text a description
    // would still read, because a description includes a hidden reference --
    // and a dot describes the item through the accessible name it carries.
    // The description follows the badge as its label, variant and visibility
    // change.
    const badgeId = `${badgeConfig.prefix}-badge-${++nextBadgeId}`;
    badge.element.id = badgeId;
    const target = component.element;
    const syncDescription = (): void => {
      const badgeClass = badge.getClass("badge");
      const shows = badge.element.classList.contains(`${badgeClass}--positioned`)
        && !badge.element.classList.contains(`${badgeClass}--invisible`)
        && (badge.getLabel() !== "" || (badge.element.getAttribute("aria-label") ?? "") !== "");
      if (shows) addIdRef(target, "aria-describedby", badgeId);
      else removeIdRef(target, "aria-describedby", badgeId);
    };
    syncDescription();
    // Through the element's own window, so the feature also works under a
    // test DOM that installs its globals piecemeal.
    const Observer = badge.element.ownerDocument.defaultView?.MutationObserver;
    const observer = Observer
      ? new Observer(syncDescription)
      : null;
    observer?.observe(badge.element, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      characterData: true,
      subtree: true,
    });
    const destroy = badge.destroy;
    badge.destroy = () => {
      observer?.disconnect();
      removeIdRef(target, "aria-describedby", badgeId);
      destroy();
    };

    return {
      ...component,
      badge
    };
  };
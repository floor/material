// src/core/utils/badge.ts

/**
 * Whether a badge label says nothing: an empty string or a zero count is no
 * badge ("a count of nothing is not news").
 *
 * Style-free on purpose, and outside the badge component: the badge, the tab
 * and the drawer item all decide with it, and an importer that carries no
 * badge (such as the drawer) must not pull the badge's code or CSS with it.
 */
export const isEmptyBadgeLabel = (formattedLabel: string): boolean =>
  formattedLabel === "" || formattedLabel === "0";

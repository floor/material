// src/components/card/index.ts

/**
 * @module Card
 *
 * Card component following Material Design 3 guidelines.
 * Cards are surfaces that display content and actions about a single topic.
 * They should be easy to scan for relevant and actionable information.
 *
 * The main export is the {@link default | createCard} factory function that creates
 * a {@link CardComponent} instance with the provided configuration.
 *
 * Features:
 * - Multiple variants: elevated, filled, and outlined
 * - Support for header, content, media, and actions sections
 * - Interactive behavior with elevation changes on hover
 * - Draggable capability
 * - Composable loading and expandable states using `createProgress` and `createIconButton({ toggle: true })`
 *
 * The API includes methods for:
 * - {@link CardComponent.addContent | Adding content}
 * - {@link CardComponent.setHeader | Setting header}
 * - {@link CardComponent.addMedia | Adding media}
 * - {@link CardComponent.setActions | Setting actions}
 * - {@link CardComponent.makeDraggable | Making cards draggable}
 * - {@link CardComponent.focus | Managing focus}
 *
 * @example
 * ```typescript
 * import { createCard } from 'material';
 *
 * // Create a basic card
 * const card = createCard({
 *   variant: 'elevated',
 *   header: {
 *     title: 'Card Title',
 *     subtitle: 'Secondary text'
 *   },
 *   content: {
 *     text: 'Card content goes here.'
 *   },
 *   buttons: [
 *     { text: 'Action', variant: 'text' }
 *   ]
 * });
 *
 * // Modify card programmatically using API methods
 * const image = document.createElement('div');
 * image.className = 'mtrl-card__media';
 * image.style.backgroundImage = 'url(path/to/image.jpg)';
 *
 * card.addMedia(image, 'top')
 *     .makeDraggable((event) => {
 *       console.log('Card drag started');
 *     });
 * ```
 *
 * @example
 * ```typescript
 * // Recipe (a): Loading card composed with createCard + createProgress
 * import { createCard, createCardContent, createProgress } from 'material';
 *
 * const progress = createProgress({
 *   variant: 'linear',
 *   indeterminate: true,
 *   ariaLabel: 'Loading article',
 * });
 * const body = createCardContent({ children: [progress.element] });
 *
 * const loadingCard = createCard({
 *   variant: 'outlined',
 *   header: { title: 'Daily briefing', subtitle: 'Fetching latest updates' },
 *   aria: { busy: 'true' },
 * });
 * loadingCard.addContent(body);
 *
 * // When loading finishes, destroy the indicator, replace the body, and clear aria-busy:
 * function finishLoading(text: string) {
 *   progress.destroy();
 *   body.replaceWith(createCardContent({ text }));
 *   loadingCard.element.removeAttribute('aria-busy');
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Recipe (b): Expandable card composed with createCard + createIconButton({ toggle: true })
 * import { createCard, createCardContent, createCardHeader, createIconButton } from 'material';
 *
 * const chevronDown = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
 * const chevronUp = '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
 *
 * const details = createCardContent({
 *   text: 'Full itinerary, check-in instructions, and local transit passes.',
 * });
 * details.id = 'trip-card-details';
 * details.hidden = true;
 *
 * const expandToggle = createIconButton({
 *   toggle: true,
 *   icon: chevronDown,
 *   selectedIcon: chevronUp,
 *   ariaLabel: 'Show trip details',
 * });
 * expandToggle.element.setAttribute('aria-expanded', 'false');
 * expandToggle.element.setAttribute('aria-controls', details.id);
 *
 * expandToggle.on('change', ({ selected }) => {
 *   details.hidden = !selected;
 *   expandToggle.element.setAttribute('aria-expanded', String(selected));
 *   expandToggle.element.setAttribute('aria-label', selected ? 'Hide trip details' : 'Show trip details');
 * });
 *
 * const expandableCard = createCard({
 *   variant: 'elevated',
 *   content: { text: 'Weekend in Lyon — 2 nights' },
 * });
 * expandableCard.setHeader(createCardHeader({
 *   title: 'Trip summary',
 *   subtitle: 'May 15–17',
 *   action: expandToggle.element,
 * }));
 * expandableCard.addContent(details);
 * ```
 *
 * @category Components
 */

/**
 * Factory function to create a new Card component.
 * @see CardComponent for the full API reference
 */
export { default, default as createCard } from "./card";

/**
 * Card component types and interfaces
 *
 * These types define the structure and behavior of the Card component.
 */
export type {
  CardVariant,
  CardElevationLevel,
  CardConfig,
  CardHeaderConfig,
  CardContentConfig,
  CardActionsConfig,
  CardMediaConfig,
  CardAriaAttributes,
  CardComponent,
  CardEvents,
} from "./types";

// Export card content helper functions
export {
  createCardContent,
  createCardHeader,
  createCardActions,
  createCardMedia,
} from "./content";

// NOTE: Constants are exported from './constants' directly
// Import constants from 'material/components/card/constants' for tree-shaking

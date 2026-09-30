// src/elements/card.ts
/**
 * `<m-card>`: the card as a custom element. It holds arbitrary content, so
 * its regions are slots, placed by the factory's own builders:
 *
 * - `media`: at the top, clipped to the card's shape;
 * - `avatar`, `headline`, `subhead` and `header-action`: the header, whose
 *   headline names the card (`headline` and `subhead` attributes are the
 *   fallback text);
 * - the default slot: the supporting content, padded;
 * - `actions`: the row of actions at the bottom.
 *
 * A region is built only when it has content, and the card is recreated when
 * a region appears or goes away; content changes inside a region are the
 * slot's. `clickable` makes the card a button (Enter and Space click it) and
 * its activation is the native `click`.
 *
 * Parts: `card`, `content`.
 *
 * @module elements
 */

import createCard from "../components/card";
import { createCardActions, createCardContent, createCardHeader, createCardMedia } from "../components/card/content";
import type { CardComponent, CardSchema } from "../components/card/types";
import { PREFIX } from "../core/config";
import { defineElement, type Config, type DefineOptions, type ElementInstance, type ElementSpec } from "./define";

type Region = "media" | "avatar" | "headline" | "subhead" | "header-action" | "content" | "actions";
const REGIONS: readonly Region[] = ["media", "avatar", "headline", "subhead", "header-action", "content", "actions"];

interface CardElementConfig extends CardSchema {
  regions?: Region[];
  headline?: string;
  subhead?: string;
  ariaLabel?: string;
}

/** The regions a card was built with, to tell when a child change needs another. */
const builtRegions = new WeakMap<CardComponent, string>();

const hasText = (node: Node): boolean => node.nodeType === 3 && (node.textContent ?? "").trim() !== "";

/** The regions the host's children and attributes fill. */
const regionsOf = (host: HTMLElement): Region[] =>
  REGIONS.filter((region) => {
    if (region === "content") {
      return Array.from(host.childNodes).some((node) => hasText(node) || (node.nodeType === 1 && !(node as Element).hasAttribute("slot")));
    }
    if ((region === "headline" || region === "subhead") && host.getAttribute(region)) return true;
    return Array.from(host.children).some((child) => child.getAttribute("slot") === region);
  });

const readCard = (host: HTMLElement): Config => ({ regions: regionsOf(host) }) satisfies CardElementConfig;

const slot = (name?: string, fallback?: string): HTMLSlotElement => {
  const element = document.createElement("slot");
  if (name) element.name = name;
  if (fallback) element.textContent = fallback;
  return element;
};

/**
 * The header builder takes text for the headline and subhead and renders
 * them in its own elements: the element builds it with placeholders and puts
 * a slot, with the attribute as its fallback, in their place.
 */
const header = (config: CardElementConfig, regions: Region[]): HTMLElement => {
  const has = (region: Region): boolean => regions.includes(region);
  const avatar = document.createElement("div");
  avatar.className = `${PREFIX}-card__header-avatar`;
  avatar.append(slot("avatar"));
  const action = document.createElement("div");
  action.className = `${PREFIX}-card__header-action`;
  action.append(slot("header-action"));
  const element = createCardHeader({
    title: has("headline") ? " " : undefined,
    subtitle: has("subhead") ? " " : undefined,
    avatar: has("avatar") ? avatar : undefined,
    action: has("header-action") ? action : undefined,
  });
  element.querySelector(`.${PREFIX}-card__header-title`)?.replaceChildren(slot("headline", config.headline));
  element.querySelector(`.${PREFIX}-card__header-subtitle`)?.replaceChildren(slot("subhead", config.subhead));
  return element;
};

const create = (config: CardElementConfig): CardComponent => {
  const { regions = [], headline, subhead, ariaLabel, ...rest } = config;
  const card = createCard({ ...rest, aria: ariaLabel ? { label: ariaLabel } : undefined });
  const has = (region: Region): boolean => regions.includes(region);
  if (has("media")) card.addMedia(createCardMedia({ element: slot("media") }));
  if (has("avatar") || has("headline") || has("subhead") || has("header-action")) {
    card.setHeader(header({ headline, subhead }, regions));
  }
  if (has("content")) card.addContent(createCardContent({ children: [slot()] }));
  if (has("actions")) {
    // Given as `actions`, the slot would be named "Action 1" for having no text.
    const actions = createCardActions({});
    actions.append(slot("actions"));
    card.setActions(actions);
  }
  builtRegions.set(card, regions.join(" "));
  return card;
};

/** A child change within the regions the card has is the slots'; a new or emptied region needs another card. */
const updateCard = (host: HTMLElement, component: CardComponent): boolean =>
  regionsOf(host).join(" ") === builtRegions.get(component);

/**
 * The card has no disabled state of its own, only the class its styles
 * dim: the element sets it, takes the card out of the tab order and says it
 * is disabled. `:host([disabled])` stops the pointer reaching the host.
 */
const setDisabled = (component: CardComponent, disabled: boolean): void => {
  const { element } = component;
  element.classList.toggle(`${component.getClass("card")}--state-disabled`, disabled);
  if (disabled) element.setAttribute("aria-disabled", "true");
  else element.removeAttribute("aria-disabled");
  if (component.config.clickable || component.config.interactive) {
    if (disabled) element.removeAttribute("tabindex");
    else element.setAttribute("tabindex", "0");
  }
};

/** An `aria-label` replaces the name the headline gives the card, and its removal gives it back. */
const setAriaLabel = (component: CardComponent, label: string | null): void => {
  const { element } = component;
  if (label !== null) {
    element.setAttribute("aria-label", label);
    element.removeAttribute("aria-labelledby");
    return;
  }
  element.removeAttribute("aria-label");
  const title = element.querySelector(`.${component.getClass("card")}__header-title`);
  if (title?.id) element.setAttribute("aria-labelledby", title.id);
};

const cardSpec = {
  name: "card",
  slots: ["avatar", "header-action", "headline", "subhead", "media", "actions"] as const,
  create: (config) => create(config as CardElementConfig),
  styles: ["card"],
  hostStyles: ":host{display:block}:host([disabled]){pointer-events:none}",
  attributes: {
    variant: { type: "string", config: "variant" },
    clickable: { type: "boolean", config: "clickable" },
    "full-width": {
      type: "boolean",
      config: "fullWidth",
      update: (c, v) => void c.element.classList.toggle(`${c.getClass("card")}--full-width`, !!v),
    },
    headline: { type: "string", config: "headline" },
    subhead: { type: "string", config: "subhead" },
    disabled: { type: "boolean", update: (c, v) => setDisabled(c, !!v) },
    "aria-label": { type: "string", config: "ariaLabel", update: (c, v) => setAriaLabel(c, v === null ? null : String(v)) },
  },
  config: readCard,
  setup: (host, c) => setDisabled(c, host.hasAttribute("disabled")),
  observeChildren: updateCard,
} satisfies ElementSpec<CardComponent>;

export const cardElement = defineElement<CardComponent>(cardSpec);
export type CardSpec = typeof cardSpec;
/** `<m-card>` as a ref or a query returns it. */
export type CardElement = ElementInstance<CardSpec, CardComponent>;

/** Registers `<m-card>` (or `<prefix-card>`). */
export const defineCard = (options?: DefineOptions): string => cardElement.define(options);

declare global {
  /** `document.querySelector("m-…")` and `createElement` return the element's type (the default prefix). */
  interface HTMLElementTagNameMap {
    "m-card": CardElement;
  }
}

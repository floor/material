// src/components/menu/features/behaviour.ts
//
// The menu's behaviour stages as one chunk, loaded by menu/surface.ts on the
// first open. The stages themselves are unchanged: this is the composition
// createMenu's pipe does at creation, moved to when the surface needs it.

import withPosition from "./position";
import withKeyboard from "./keyboard";
import withOpener from "./opener";
import type { MenuConfig, MenuFeatureHost } from "../types";
import type { MenuBehaviour } from "./on-demand-behaviour";

/** What the three stages together promise on a host that has its element. */
type ComposedBehaviour = MenuFeatureHost & {
  position: MenuBehaviour["position"];
  keyboard: MenuBehaviour["keyboard"];
  opener: MenuBehaviour["opener"];
};

/**
 * Composes position, keyboard and opener onto `component`, in the order
 * createMenu runs them, and hands back the three features the stand-in
 * delegates to.
 *
 * @param config - The menu's configuration; its opener is the current one
 * @param component - The menu after its controller: the opener stage needs it
 * @returns The three features, ready to answer the queued calls
 */
export const createBehaviour = (
  config: MenuConfig,
  component: MenuFeatureHost,
): MenuBehaviour => {
  const positioned = withPosition(config)(component);
  const keyboarded = withKeyboard()(positioned);
  const opened = withOpener(config)(keyboarded);

  // Each stage keeps its `if (!component.element)` guard, so its return type
  // still allows the untouched component. That guard cannot fire here:
  // MenuFeatureHost requires the element (features/opener.ts's comment on the
  // same guard). Narrowed once, here.
  const composed = opened as ComposedBehaviour;

  return {
    position: composed.position,
    keyboard: composed.keyboard,
    opener: composed.opener,
  };
};

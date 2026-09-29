// src/components/menu/features/layer.ts

import { MenuConfig } from "../types";

/**
 * Whether an event happened inside a node. A top-layer menu may render in a
 * shadow root, and a document listener then sees the event retargeted to the
 * host; the event's composed path still holds the node. The menu without a
 * layer keeps the test it always had.
 */
export const eventWithin = (
  config: MenuConfig,
  node: Node,
  event: Event,
): boolean =>
  config.layer === "top"
    ? event.composedPath().includes(node)
    : node.contains(event.target as Node);

/**
 * Whether focus moving to `target` moved into a node. A top-layer menu may
 * render in a shadow root other than its opener's (a menu element anchored
 * to a button of the page): a focus event at the opener then names the
 * shadow host the node is inside, not the node.
 */
export const focusWithin = (
  config: MenuConfig,
  node: Node,
  target: Node | null,
): boolean => {
  if (!target) return false;
  if (node.contains(target)) return true;
  if (config.layer !== "top") return false;
  for (let root = node.getRootNode(); "host" in root; root = (root as ShadowRoot).host.getRootNode()) {
    if ((root as ShadowRoot).host === target) return true;
  }
  return false;
};

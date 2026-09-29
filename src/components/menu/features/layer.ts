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

// Shared construction primitives. Policy (focus, scrolling, ownership) belongs
// to each caller, so a compatibility facade never starts the toolbar policy.
import { pipe } from "../../core/compose/pipe";
import { createBase, withElement, type BaseConfig, type WithElementOptions } from "../../core/compose/component";
import { withEvents, withLifecycle } from "../../core/compose/features";

/** Construct the real root and live actions bar before attaching listeners. */
export function createToolbarStructure(
  settings: object,
  options: WithElementOptions,
  barClass: string,
  attributes: Record<string, string>,
) {
  const component = pipe(createBase, withEvents(), withElement(options), withLifecycle())(settings as BaseConfig);
  const bar = document.createElement("div");
  bar.className = barClass;
  for (const [name, value] of Object.entries(attributes)) bar.setAttribute(name, value);
  component.element.appendChild(bar);
  return { component, bar };
}

/** A caller-owned FAB sits outside the actions bar and its focus policy. */
export function createToolbarFab(root: HTMLElement, className: string, before: HTMLElement | null = null) {
  const fab = document.createElement("div");
  fab.className = className;
  root.insertBefore(fab, before);
  return fab;
}

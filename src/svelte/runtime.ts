// src/svelte/runtime.ts
/**
 * What every generated Svelte component (`dist/svelte/*.svelte`) runs.
 *
 * A component renders its tag with `<svelte:element>`, spreads
 * `attributes(...)` on it and attaches `action`. Attributes are rendered as
 * attributes, so server markup carries them; live-state properties
 * (`checked`, `value`) are `$bindable()` props the action writes to the
 * element and writes back after each element event, so `bind:checked` works;
 * the attribute a live property shadows is its `default*` prop. Element
 * events are `on<event>` callback props, as Svelte 5 names them. The element
 * registers when the action first runs, never at import.
 *
 * @module svelte
 */

import type { Snippet } from "svelte";
import type { Action } from "svelte/action";
import type { HTMLAttributes } from "svelte/elements";
import type { DefineOptions, ElementEvents, ElementProperties, ElementProps, ElementSlotProp } from "../elements";
import {
  describe,
  describeDeclaration,
  getPrefix,
  isBrowser,
  serverDefaults,
  toAttribute,
  writeDefaults,
  writeLive,
  type ComponentSpec,
  type DeclarationSpec,
  type DefaultProps,
  type FormProps,
} from "../elements/adapter";

export { configure } from "../elements/adapter";

/**
 * A named snippet: a function prop that is not a handler (`on…`) nor
 * `children`. It renders into the slot of its name (FLO-325).
 */
const isSnippet = (key: string, value: unknown): boolean =>
  typeof value === "function" && key !== "children" && !/^on[a-z]/.test(key);

/** A snippet's name as a slot name: `headerAction` → `header-action`. */
const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `change` → `onchange`, as Svelte 5 names event props, typed with the element's event. */
export type EventProps<S> = {
  [K in keyof ElementEvents<S> & string as `on${K}`]?: (event: ElementEvents<S>[K]) => void;
};

type BaseProps<S> = ElementProps<S> & DefaultProps<S> & FormProps<S> & EventProps<S>;

/**
 * Each named slot as a snippet prop (`{#snippet actions()}`); a text prop of
 * the same name (`headline`) takes its text or a snippet (FLO-325).
 */
type SnippetProps<S, P> = {
  [K in ElementSlotProp<S>]?: (K extends keyof P ? Exclude<P[K], undefined> : never) | Snippet;
};

type OwnProps<S> = Omit<BaseProps<S>, ElementSlotProp<S>> & SnippetProps<S, BaseProps<S>>;

/** Props of a generated component: the element's own, plus any HTML attribute for the host. */
export type SvelteProps<S> = OwnProps<S> &
  Omit<HTMLAttributes<HTMLElement>, keyof OwnProps<S> | "children"> & { children?: Snippet };

/** The live properties a generated component binds (`bind:checked`). */
export type Bindable<S> = keyof ElementProperties<S> & string;

export type DeclarationProps<A> = A & Omit<HTMLAttributes<HTMLElement>, keyof A | "children"> & { children?: Snippet };

/** What a generated component passes its action on every update. */
export interface Binding {
  /** The component's props other than the bindable ones and `children`. */
  props: Record<string, unknown>;
  /** The bindable props' current values. */
  live: Record<string, unknown>;
  /** Writes a bindable prop back, for `bind:`. */
  set: Record<string, (value: unknown) => void>;
}

export interface Adapter {
  tag: string;
  /** What to spread on the element. */
  attributes: (props: Record<string, unknown>, live: Record<string, unknown>) => Record<string, unknown>;
  /** The named snippets, each with the slot it renders into (`headerAction` → `header-action`). */
  snippets: (props: Record<string, unknown>) => Array<[slot: string, snippet: Snippet]>;
  action: Action<HTMLElement, Binding>;
}

/**
 * The runtime of the Svelte component for an element.
 * @param spec - The element's spec (`switchElement.spec`)
 * @param define - Registers the element and anything it needs (`defineSwitch`)
 */
export const adapter = (spec: ComponentSpec, define: (options?: DefineOptions) => string): Adapter => {
  const described = describe(spec);
  const { attributes, properties, events, form } = described;
  const eventProps = new Set(events.map((event) => `on${event}`));

  const hostAttributes = (props: Record<string, unknown>, live: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      const attribute = attributes.get(key);
      if (eventProps.has(key)) continue; // the action listens
      if (isSnippet(key, value)) continue; // rendered into its slot (FLO-325)
      if (attribute) {
        // Svelte writes a key the element has as a property; a shadowed
        // attribute (`checked`) shares its name with the live property, so
        // the browser gets it as an attribute from the action instead.
        if (attribute.shadowed && isBrowser) continue;
        result[attribute.name] = toAttribute(attribute.type, value);
      } else if (key !== "name" || form) {
        result[key] = value;
      }
    }
    if (!isBrowser) for (const [name, value] of serverDefaults(described, (p) => live[p])) result[name] ??= value;
    // Attachments (`{@attach}`) are symbol-keyed props: Svelte applies them
    // from the spread, which `Object.entries` does not see (FLO-325).
    for (const symbol of Object.getOwnPropertySymbols(props)) result[symbol as unknown as string] = props[symbol as unknown as string];
    return result;
  };

  const snippets = (props: Record<string, unknown>): Array<[string, Snippet]> =>
    Object.entries(props)
      .filter(([key, value]) => isSnippet(key, value))
      .map(([key, value]) => [kebab(key), value as Snippet]);

  const action: Action<HTMLElement, Binding> = (node, initial) => {
    let binding = initial;
    const target = node as unknown as Record<string, unknown>;

    const sync = (): void => {
      writeDefaults(node, described, (key) => binding.props[key]);
      writeLive(node, described, (property) => binding.live[property]);
    };

    sync();
    define({ prefix: getPrefix() });
    sync();

    const listeners = events.map((event) => {
      const listener = (e: Event): void => {
        const handler = binding.props[`on${event}`];
        if (typeof handler === "function") (handler as (e: Event) => void)(e);
        for (const property of properties) {
          const value = target[property];
          if (value !== binding.live[property]) binding.set[property]?.(value);
        }
      };
      node.addEventListener(event, listener);
      return (): void => node.removeEventListener(event, listener);
    });

    return {
      update(next: Binding) {
        binding = next;
        sync();
      },
      destroy() {
        listeners.forEach((remove) => remove());
      },
    };
  };

  return { tag: `${getPrefix()}-${spec.name}`, attributes: hostAttributes, snippets, action };
};

/** The runtime of the Svelte component for a declaration child; its parent registers the tag. */
export const declaration = (
  spec: DeclarationSpec
): { tag: string; attributes: (props: Record<string, unknown>) => Record<string, unknown> } => {
  const attributes = describeDeclaration(spec);
  return {
    tag: `${getPrefix()}-${spec.name}`,
    attributes: (props) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        const attribute = attributes.get(key);
        result[attribute ? attribute.name : key] = attribute ? toAttribute(attribute.type, value) : value;
      }
      return result;
    },
  };
};

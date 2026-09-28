// src/solid/create.ts
/**
 * Solid components over the elements.
 *
 * `createComponent` renders the element's tag with `Dynamic`. Attributes are
 * props, rendered as attributes so server markup carries them; live-state
 * properties (`checked`, `value`) are props the component writes to the
 * element whenever they change; the attribute a live property shadows is its
 * `default*` prop. Element events are `on<Event>` callbacks. Props stay
 * reactive: every host attribute is a getter over the component's props. The
 * element registers on mount, never at import.
 *
 * Written without JSX, so it compiles with the rest of the library.
 *
 * @module solid
 */

import { createEffect, mergeProps, onCleanup, onMount, splitProps, type Component, type JSX } from "solid-js";
import { Dynamic, isServer } from "solid-js/web";
import type { AttributeType, DefineOptions, ElementEvents, ElementProps } from "../elements";
import {
  describe,
  describeDeclaration,
  getPrefix,
  pascal,
  toAttribute,
  type ComponentSpec,
  type DeclarationSpec,
  type DefaultProps,
  type FormProps,
  type Pascal,
} from "../elements/adapter";

export { configure } from "../elements/adapter";
export type { DefaultProps, FormProps } from "../elements/adapter";

/** `change` → `onChange`, typed with the element's event. */
export type EventProps<S> = {
  [K in keyof ElementEvents<S> & string as `on${Pascal<K>}`]?: (event: ElementEvents<S>[K]) => void;
};

type OwnProps<S> = ElementProps<S> & DefaultProps<S> & FormProps<S> & EventProps<S>;

/** Props of a generated component: the element's own, plus any HTML attribute for the host. */
export type SolidProps<S, E extends HTMLElement> = OwnProps<S> &
  Omit<JSX.HTMLAttributes<HTMLElement>, keyof OwnProps<S> | "ref"> & {
    ref?: E | ((element: E) => void);
  };

export type DeclarationProps<A> = A & Omit<JSX.HTMLAttributes<HTMLElement>, keyof A>;

/** A generated component. */
export type MComponent<S, E extends HTMLElement> = Component<SolidProps<S, E>>;

/** A generated declaration component. */
export type MDeclaration<A> = Component<DeclarationProps<A>>;

type Props = Record<string, unknown>;

/**
 * A value as Solid should render it on the host. Solid's server renderer
 * treats `checked`, `disabled` and the like as boolean attributes and drops a
 * falsy value, so a present boolean is `true` here, not the `""` other
 * adapters use.
 */
const toHost = (type: AttributeType, value: unknown): unknown => {
  const attribute = toAttribute(type, value);
  return type === "boolean" && attribute !== undefined ? true : attribute;
};

/**
 * The Solid component for an element.
 * @param spec - The element's spec (`switchElement.spec`)
 * @param define - Registers the element and anything it needs (`defineSwitch`)
 * @param _name - Unused: Solid components have no display name. Kept so every
 *   adapter's generated list has the same shape.
 */
export const createComponent = <S, E extends HTMLElement>(
  spec: ComponentSpec,
  define: (options?: DefineOptions) => string,
  _name?: string
): MComponent<S, E> => {
  const { attributes, properties, events, form } = describe(spec);
  const eventProps = events.map((event) => `on${pascal(event)}`);
  const own = [...attributes.keys(), ...properties, ...eventProps, ...(form ? ["name"] : []), "ref"];

  const component = (props: Props): JSX.Element => {
    const [, others] = splitProps(props, own);
    let element: E | undefined;

    // Every host attribute is a getter, so Solid keeps it reactive.
    const host: Props = {};
    for (const [key, attribute] of attributes) {
      // Solid writes a key the element has as a property; a shadowed attribute
      // (`checked`) shares its name with the live property, so the browser
      // gets it as an attribute from the effect below instead.
      if (attribute.shadowed && !isServer) continue;
      Object.defineProperty(host, attribute.name, {
        enumerable: true,
        get: () => {
          const value = props[key];
          if (value === undefined && attribute.shadowed) {
            // On the server a live value is the markup's default, so the page
            // renders in that state before it hydrates.
            return toHost(attribute.type, props[attribute.name]);
          }
          return toHost(attribute.type, value);
        },
      });
    }
    if (form) Object.defineProperty(host, "name", { enumerable: true, get: () => props.name });

    const ref = (node: E): void => {
      element = node;
      const forwarded = props.ref;
      if (typeof forwarded === "function") (forwarded as (el: E) => void)(node);
    };

    const sync = (): void => {
      const el = element;
      if (!el) return;
      for (const [key, attribute] of attributes) {
        if (!attribute.shadowed) continue;
        const value = toAttribute(attribute.type, props[key]);
        if (value === undefined) el.removeAttribute(attribute.name);
        else if (el.getAttribute(attribute.name) !== value) el.setAttribute(attribute.name, value);
      }
      const target = el as unknown as Props;
      for (const property of properties) {
        const value = props[property];
        if (value !== undefined && target[property] !== value) target[property] = value;
      }
    };

    onMount(() => {
      const el = element;
      if (!el) return;
      sync();
      define({ prefix: getPrefix() });
      sync();
      for (const event of events) {
        const listener = (e: Event): void => {
          const handler = props[`on${pascal(event)}`];
          if (typeof handler === "function") (handler as (e: Event) => void)(e);
        };
        el.addEventListener(event, listener);
        onCleanup(() => el.removeEventListener(event, listener));
      }
    });
    // Reads every live prop and default, so it reruns when one changes.
    createEffect(sync);

    return Dynamic(mergeProps(others, host, { component: `${getPrefix()}-${spec.name}`, ref }) as never);
  };
  return component as unknown as MComponent<S, E>;
};

/** The Solid component for a declaration child; its parent registers the tag. */
export const createDeclaration = <A>(spec: DeclarationSpec, _name?: string): MDeclaration<A> => {
  const attributes = describeDeclaration(spec);
  const component = (props: Props): JSX.Element => {
    const [, others] = splitProps(props, [...attributes.keys()]);
    const host: Props = {};
    for (const [key, attribute] of attributes) {
      Object.defineProperty(host, attribute.name, {
        enumerable: true,
        get: () => toHost(attribute.type, props[key]),
      });
    }
    return Dynamic(mergeProps(others, host, { component: `${getPrefix()}-${spec.name}` }) as never);
  };
  return component as unknown as MDeclaration<A>;
};

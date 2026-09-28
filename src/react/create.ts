// src/react/create.ts
"use client";
/**
 * React components over the elements.
 *
 * `createComponent` renders the element's tag and keeps React's model:
 * attributes are passed as attributes, so server-rendered markup carries them;
 * live-state properties (`checked`, `value`) are set on the element after each
 * render, and are controlled when given, like React's own inputs; the
 * attribute they shadow is the `default*` prop. Events are typed `on*`
 * callbacks. The element is registered on first mount, never at import.
 *
 * Works the same on React 18 and 19: the component sets properties and
 * attaches listeners itself rather than relying on React 19's custom element
 * support.
 *
 * @module react
 */

import * as React from "react";
import type { DefineOptions, ElementEvents, ElementProps } from "../elements";
import {
  describe,
  describeDeclaration,
  getPrefix,
  isBrowser,
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

type OwnProps<S> = ElementProps<S> & DefaultProps<S> & EventProps<S>;

/** Props of a generated component: the element's own, plus any HTML attribute for the host. */
export type ComponentProps<S> = OwnProps<S> &
  FormProps<S> &
  Omit<React.HTMLAttributes<HTMLElement>, keyof OwnProps<S>> & { children?: React.ReactNode };

/** A generated component; named so declarations stay short. */
export type MComponent<S, E extends HTMLElement> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<ComponentProps<S>> & React.RefAttributes<E>
>;

const useIsomorphicLayoutEffect = isBrowser ? React.useLayoutEffect : React.useEffect;

const assignRef = <E>(ref: React.ForwardedRef<E>, value: E | null): void => {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
};

/**
 * The React component for an element.
 * @param spec - The element's spec (`switchElement.spec`)
 * @param define - Registers the element and anything it needs (`defineSwitch`)
 */
export const createComponent = <S, E extends HTMLElement>(
  spec: ComponentSpec,
  define: (options?: DefineOptions) => string,
  displayName: string
): MComponent<S, E> => {
  const described = describe(spec);
  const properties = new Set(described.properties);
  const attributes = described.attributes;
  const events = new Map(described.events.map((event) => [`on${pascal(event)}`, event]));

  const Component = React.forwardRef<E, ComponentProps<S>>((props, forwardedRef) => {
    const element = React.useRef<E | null>(null);
    const host: Record<string, unknown> = {};
    const live: Record<string, unknown> = {};
    const handlers: Record<string, (event: Event) => void> = {};
    const defaults: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      const event = events.get(key);
      const attribute = attributes.get(key);
      if (event) {
        if (typeof value === "function") handlers[event] = value as (event: Event) => void;
      } else if (properties.has(key)) {
        live[key] = value;
        // On the server a controlled value is the markup's default, so the
        // page renders in that state before it hydrates.
        const shadowed = attributes.get(`default${pascal(key)}`);
        if (!isBrowser && shadowed && value !== undefined && host[shadowed.name] === undefined) {
          host[shadowed.name] = toAttribute(shadowed.type, value);
        }
      } else if (attribute?.shadowed) {
        // React 19 assigns a prop to a same-named element property in the
        // browser, which here is the live state (`checked`), not the default.
        // The server renders the attribute; the browser sets it below.
        if (isBrowser) defaults[attribute.name] = toAttribute(attribute.type, value);
        else host[attribute.name] = toAttribute(attribute.type, value);
      } else if (attribute) {
        host[attribute.name] = toAttribute(attribute.type, value);
      } else if (key === "className") {
        // React 18 renders className on a custom element as a literal
        // `className` attribute; React 19 as `class`. Pass `class` to both.
        host.class = value;
      } else {
        host[key] = value;
      }
    }

    // The latest handlers and controlled values, read by listeners that are
    // attached once.
    const latest = React.useRef({ handlers, live });
    useIsomorphicLayoutEffect(() => {
      latest.current = { handlers, live };
    });

    // Defaults first, so an element upgraded by define() is created from them.
    useIsomorphicLayoutEffect(() => {
      const el = element.current;
      if (!el) return;
      for (const [name, value] of Object.entries(defaults)) {
        if (value === undefined) el.removeAttribute(name);
        else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
      }
    });

    useIsomorphicLayoutEffect(() => {
      define({ prefix: getPrefix() });
    }, []);

    // Controlled properties follow their props after every render.
    useIsomorphicLayoutEffect(() => {
      const el = element.current as unknown as Record<string, unknown> | null;
      if (!el) return;
      for (const [key, value] of Object.entries(live)) {
        if (value !== undefined && el[key] !== value) el[key] = value;
      }
    });

    React.useEffect(() => {
      const el = element.current;
      if (!el) return;
      const listeners = [...new Set(events.values())].map((event) => {
        const listener = (e: Event): void => {
          latest.current.handlers[event]?.(e);
          // Controlled: if the handler did not change the prop, put it back,
          // as React does for <input checked>. React flushes a state update
          // from the handler before this microtask runs.
          queueMicrotask(() => {
            const target = element.current as unknown as Record<string, unknown> | null;
            if (!target) return;
            for (const [key, value] of Object.entries(latest.current.live)) {
              if (value !== undefined && target[key] !== value) target[key] = value;
            }
          });
        };
        el.addEventListener(event, listener);
        return (): void => el.removeEventListener(event, listener);
      });
      return () => listeners.forEach((remove) => remove());
    }, []);

    const ref = React.useCallback(
      (node: E | null) => {
        element.current = node;
        assignRef(forwardedRef, node);
      },
      [forwardedRef]
    );

    // `children` passed to the host through `host` like any other prop.
    return React.createElement(`${getPrefix()}-${spec.name}`, { ...host, ref });
  });
  Component.displayName = displayName;
  return Component as MComponent<S, E>;
};

export type DeclarationProps<A> = A & Omit<React.HTMLAttributes<HTMLElement>, keyof A> & { children?: React.ReactNode };

/** A generated declaration component. */
export type MDeclaration<A> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<DeclarationProps<A>> & React.RefAttributes<HTMLElement>
>;

/** The React component for a declaration child; its parent registers the tag. */
export const createDeclaration = <A>(
  spec: DeclarationSpec,
  displayName: string
): MDeclaration<A> => {
  const attributes = describeDeclaration(spec);
  const Component = React.forwardRef<HTMLElement, DeclarationProps<A>>((props, ref) => {
    const host: Record<string, unknown> = { ref };
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      const attribute = attributes.get(key);
      const name = attribute ? attribute.name : key === "className" ? "class" : key;
      host[name] = attribute ? toAttribute(attribute.type, value) : value;
    }
    return React.createElement(`${getPrefix()}-${spec.name}`, host);
  });
  Component.displayName = displayName;
  return Component as MDeclaration<A>;
};

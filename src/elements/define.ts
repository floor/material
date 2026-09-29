// src/elements/define.ts
/**
 * `defineElement` turns a component factory into a custom element.
 *
 * The element owns one factory instance, built inside its shadow root on first
 * connection. Attributes are the component's defaults, as on native controls;
 * properties carry its live state. Factory events are re-dispatched from the
 * host under the same names.
 *
 * Nothing here touches the DOM at import time: the element class is built on
 * first use, so every element module can be imported on a server.
 *
 * @module elements
 */

import { applyStyles, hasStyles, registerStyles } from "./styles";

/** The part of a component the element relies on. */
export interface ElementComponent {
  element: HTMLElement;
  destroy: () => void;
}

/** Components type `on`/`off` against their own event maps; the element subscribes by name. */
interface Subscribable {
  on?: (event: string, handler: (payload: never) => void) => unknown;
  off?: (event: string, handler: (payload: never) => void) => unknown;
}

export type AttributeType = "string" | "boolean" | "number";
export type AttributeValue = string | boolean | number | null;
export type Config = Record<string, unknown>;

export interface AttributeSpec<C> {
  type: AttributeType;
  /** Config key the attribute feeds at creation. Omitted: the attribute is not passed to the factory. */
  config?: string;
  /** Applies a change after creation. Omitted: the component is recreated. */
  update?: (component: C, value: AttributeValue, host: HTMLElement) => void;
}

export interface PropertySpec<C> {
  get: (component: C) => unknown;
  set: (component: C, value: unknown) => void;
  /** Config key a value set before creation feeds. */
  config?: string;
}

export interface EventSpec {
  /** Maps the factory payload to the event's `detail`. Default: the payload. */
  detail?: (payload: unknown) => unknown;
}

export interface SlotSpec {
  /** Attribute whose text is the slot's fallback content. */
  attribute: string;
  /**
   * The config key that takes the text or a node (`text`, `label`): the
   * element passes its `<slot>` there and the factory places it.
   */
  config: string;
}

export interface FormSpec<C> {
  /** The value submitted with the form; null submits nothing. */
  value: (component: C) => string | null;
  /** The inner control whose validity the element reports. */
  control?: (component: C) => HTMLInputElement | null;
  /** Events after which the form value is read again. */
  events?: readonly string[];
  /** Called when a `<label for>` or the host itself is clicked. */
  activate?: (component: C) => void;
  /**
   * The state the browser keeps for the control, to hand back through
   * `restore` when it restores the form (history navigation, autofill).
   */
  state?: (component: C) => string;
  restore?: (component: C, state: string) => void;
  disable?: (component: C, disabled: boolean) => void;
}

/** What a spec's `setup` sees of the element. */
export interface ElementHost<C extends ElementComponent> extends HTMLElement {
  /** The factory instance, while connected. */
  readonly component: C | null;
  readonly internals: ElementInternals | null;
}

export interface ElementSpec<C extends ElementComponent> {
  /** Name after the prefix: "switch" registers `<m-switch>`. */
  name: string;
  create: (config: Config) => C;
  /** Style entries, in cascade order. */
  styles: readonly string[];
  /** CSS for the host, after the shared host rules. */
  hostStyles?: string;
  attributes?: Record<string, AttributeSpec<C>>;
  properties?: Record<string, PropertySpec<C>>;
  methods?: readonly string[];
  /** The live property two-way binding drives (`v-model`, Svelte's `bind:`). */
  model?: string;
  events?: Record<string, EventSpec>;
  slot?: SlotSpec;
  form?: FormSpec<C>;
  /** Extra config read from the host, such as children. */
  config?: (host: HTMLElement) => Config;
  /** Wiring that lives as long as one component; returns its cleanup. */
  setup?: (host: ElementHost<C>, component: C) => (() => void) | void;
  /**
   * React to the host's children changing. `true` recreates the component; a
   * function updates it in place and returns false when it cannot, which
   * falls back to recreating.
   */
  observeChildren?: boolean | ((host: ElementHost<C>, component: C) => boolean);
}

export interface DefineOptions {
  /** Tag prefix, without the dash. Default "m". */
  prefix?: string;
}

export const DEFAULT_PREFIX = "m";

/**
 * Global base styles components rely on, which a shadow root does not inherit.
 * Registered under these names like the component entries.
 */
export const SHADOW_BASE_STYLES = ["ripple"] as const;

const BASE_HOST_STYLES =
  ":host{display:inline-block}:host([hidden]){display:none}*,*::before,*::after{box-sizing:border-box}";

// ---------------------------------------------------------------------------
// Types derived from a spec, for the elements and the framework adapters.

type Camel<S extends string> = S extends `${infer H}-${infer T}` ? `${H}${Capitalize<Camel<T>>}` : S;
type ValueOf<T> = T extends "boolean" ? boolean : T extends "number" ? number : string;
type Get<S, K extends string> = S extends { [P in K]: infer V } ? V : Record<never, never>;

/** Attributes as properties, camelCased: `supporting-text` is `supportingText`. */
export type ElementAttributes<S> = {
  [K in keyof Get<S, "attributes"> & string as Camel<K>]?: Get<S, "attributes">[K] extends { type: infer T }
    ? ValueOf<T>
    : never;
};

/** Live-state properties, typed by their getter. */
export type ElementProperties<S> = {
  [K in keyof Get<S, "properties"> & string]?: Get<S, "properties">[K] extends { get: (c: never) => infer R }
    ? R
    : unknown;
};

/** The slot's fallback-text attribute, when the spec has one. */
export type ElementSlotText<S> = S extends { slot: { attribute: infer A extends string } }
  ? string extends A
    ? Record<never, never> // a widened name would become an index signature: declare it `as const`
    : { [K in A]?: string }
  : Record<never, never>;

/** Event names to their `CustomEvent`, typed by the spec's `detail` mapper. */
export type ElementEvents<S> = {
  [K in keyof Get<S, "events"> & string]: CustomEvent<
    Get<S, "events">[K] extends { detail: (p: never) => infer D } ? D : unknown
  >;
};

/** Methods the element forwards to its component. */
export type ElementMethods<S, C> = S extends { methods: readonly (infer M)[] }
  ? string extends M
    ? Record<never, never> // a widened list names no method in particular: declare it `as const`
    : { [K in M & keyof C & string]: C[K] extends (...args: infer A) => unknown ? (...args: A) => unknown : never }
  : Record<never, never>;

/**
 * Every property an element instance has, beyond HTMLElement's. A live-state
 * property replaces the attribute of the same name: the `checked` property is
 * the switch's current state, the `checked` attribute only its default.
 */
export type ElementProps<S> = Omit<ElementAttributes<S>, keyof ElementProperties<S>> &
  ElementProperties<S> &
  ElementSlotText<S>;

/** An element instance, as a ref or `document.querySelector` returns it. */
export type ElementInstance<S, C extends ElementComponent> = ElementHost<C> & ElementProps<S> & ElementMethods<S, C>;

// ---------------------------------------------------------------------------

const camel = (name: string): string => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const read = (host: HTMLElement, name: string, type: AttributeType): AttributeValue => {
  const raw = host.getAttribute(name);
  if (type === "boolean") return raw !== null;
  if (raw === null) return null;
  if (type === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  return raw;
};

/**
 * Writes a property to its attribute. A boolean is present for any value but
 * `false`, `null` and `undefined`, so `""` (how server-rendered markup and
 * framework adapters spell a present boolean) reads as true.
 */
const write = (host: HTMLElement, name: string, type: AttributeType, value: unknown): void => {
  if (type === "boolean") host.toggleAttribute(name, value !== false && value !== null && value !== undefined);
  else if (value === null || value === undefined) host.removeAttribute(name);
  else host.setAttribute(name, String(value));
};

const hasContent = (host: HTMLElement): boolean =>
  Array.from(host.childNodes).some(
    (node) => node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? "").trim() !== "")
  );

/** The element class for a spec. Called on first use, never at import. */
const createElementClass = <C extends ElementComponent>(spec: ElementSpec<C>): CustomElementConstructor => {
  class MElement extends HTMLElement implements ElementHost<C> {
    static formAssociated = !!spec.form;
    static observedAttributes = [
      ...Object.keys(spec.attributes ?? {}),
      ...(spec.slot ? [spec.slot.attribute] : []),
    ];

    component: C | null = null;
    readonly internals: ElementInternals | null;

    #pending = new Map<string, unknown>();
    #restoreState: string | null = null;
    #silent = 0;
    #cleanup: Array<() => void> = [];
    #observer: MutationObserver | null = null;
    #slot: HTMLSlotElement | null = null;

    constructor() {
      super();
      this.attachShadow({ mode: "open", delegatesFocus: true });
      this.internals = spec.form && typeof this.attachInternals === "function" ? this.attachInternals() : null;
    }

    connectedCallback(): void {
      this.#upgradeProperties();
      if (!this.component) this.#build();
    }

    disconnectedCallback(): void {
      // A move is a disconnect then a connect in the same task: keep the component.
      queueMicrotask(() => {
        if (!this.isConnected) this.#teardown();
      });
    }

    attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
      if (!this.component || previous === next) return;
      if (spec.slot && name === spec.slot.attribute && this.#slot) {
        this.#slot.textContent = next ?? "";
        return;
      }
      const attribute = spec.attributes?.[name];
      if (!attribute) return;
      if (attribute.update) {
        this.#quietly(() => attribute.update?.(this.component as C, read(this, name, attribute.type), this));
        this.#syncForm();
      } else {
        this.#rebuild(true);
      }
    }

    // Form-associated callbacks; only reached when the spec has a form.

    formResetCallback(): void {
      // Attributes are the defaults: rebuilding from them is the reset.
      this.#pending.clear();
      this.#rebuild(false);
    }

    formStateRestoreCallback(state: unknown): void {
      if (typeof state !== "string" || !spec.form?.restore) return;
      if (!this.component) {
        this.#restoreState = state; // applied once the component is built
        return;
      }
      this.#quietly(() => spec.form?.restore?.(this.component as C, state));
      this.#syncForm();
    }

    formDisabledCallback(disabled: boolean): void {
      const form = spec.form;
      if (this.component && form?.disable) this.#quietly(() => form.disable?.(this.component as C, disabled));
    }

    getProperty(name: string): unknown {
      const property = spec.properties?.[name];
      if (!property) return undefined;
      return this.component ? property.get(this.component) : this.#pending.get(name);
    }

    setProperty(name: string, value: unknown): void {
      const property = spec.properties?.[name];
      if (!property) return;
      if (!this.component) {
        this.#pending.set(name, value);
        return;
      }
      this.#quietly(() => property.set(this.component as C, value));
      this.#syncForm();
    }

    callMethod(name: string, args: unknown[]): unknown {
      const component = this.component as unknown as Record<string, unknown> | null;
      const method = component?.[name];
      if (typeof method !== "function") return undefined;
      const result = (method as (...a: unknown[]) => unknown).apply(component, args);
      this.#syncForm();
      return result === component ? this : result;
    }

    /** Runs `fn` without re-dispatching the events it causes. */
    #quietly(fn: () => void): void {
      this.#silent++;
      try {
        fn();
      } finally {
        this.#silent--;
      }
    }

    /** Reads a property as set before the element was upgraded, then routes it through the setter. */
    #upgradeProperties(): void {
      const names = [...Object.keys(spec.attributes ?? {}).map(camel), ...Object.keys(spec.properties ?? {})];
      const self = this as unknown as Record<string, unknown>;
      for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(this, name)) {
          const value = self[name];
          delete self[name];
          self[name] = value;
        }
      }
    }

    #config(): Config {
      const config: Config = {};
      for (const [name, attribute] of Object.entries(spec.attributes ?? {})) {
        if (!attribute.config) continue;
        const value = read(this, name, attribute.type);
        if (value !== null && value !== false) config[attribute.config] = value;
      }
      if (spec.slot) {
        // The factory places the slot where its text goes; the attribute is
        // the slot's fallback, shown when the element has no content.
        const text = this.getAttribute(spec.slot.attribute);
        if (text || hasContent(this)) {
          const slot = document.createElement("slot");
          slot.textContent = text ?? "";
          config[spec.slot.config] = slot;
          this.#slot = slot;
        }
      }
      Object.assign(config, spec.config?.(this));
      for (const [name, property] of Object.entries(spec.properties ?? {})) {
        if (property.config && this.#pending.has(name)) {
          config[property.config] = this.#pending.get(name);
          this.#pending.delete(name);
        }
      }
      return config;
    }

    #build(): void {
      const root = this.shadowRoot as ShadowRoot;
      applyStyles(root, [`host:${spec.name}`, ...SHADOW_BASE_STYLES, ...spec.styles]);
      const component = spec.create(this.#config());
      this.component = component;
      // A factory that did not place the slot leaves the element without one.
      if (this.#slot && !component.element.contains(this.#slot)) this.#slot = null;

      root.append(component.element);
      const events = component as unknown as Subscribable;

      for (const [event, eventSpec] of Object.entries(spec.events ?? {})) {
        const handler = (payload: never): void => {
          this.#syncForm();
          if (this.#silent) return;
          const detail = eventSpec.detail ? eventSpec.detail(payload) : payload;
          this.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
        };
        events.on?.(event, handler);
        this.#cleanup.push(() => events.off?.(event, handler));
      }
      for (const event of spec.form?.events ?? []) {
        if (spec.events?.[event]) continue;
        const handler = (): void => this.#syncForm();
        events.on?.(event, handler);
        this.#cleanup.push(() => events.off?.(event, handler));
      }

      // Properties set before creation that did not go into the config.
      for (const [name, value] of this.#pending) {
        const property = spec.properties?.[name];
        if (property) this.#quietly(() => property.set(component, value));
      }
      this.#pending.clear();
      if (this.#restoreState !== null) {
        const state = this.#restoreState;
        this.#restoreState = null;
        this.#quietly(() => spec.form?.restore?.(component, state));
      }

      if (spec.form?.activate) {
        // A click on the host itself (a <label for> pointing at it) activates the control.
        const onClick = (event: MouseEvent): void => {
          if (event.composedPath()[0] === this) spec.form?.activate?.(component);
        };
        this.addEventListener("click", onClick);
        this.#cleanup.push(() => this.removeEventListener("click", onClick));
      }

      const cleanup = spec.setup?.(this, component);
      if (cleanup) this.#cleanup.push(cleanup);

      if ((spec.slot && !this.#slot) || spec.observeChildren) {
        // Content arriving later than creation needs a container the factory builds.
        this.#observer = new MutationObserver(() => {
          const observe = spec.observeChildren;
          if (typeof observe === "function" && this.component && observe(this, this.component)) return;
          if (observe || (!this.#slot && hasContent(this))) this.#rebuild(true);
        });
        this.#observer.observe(this, {
          childList: true,
          subtree: !!spec.observeChildren,
          attributes: !!spec.observeChildren,
          characterData: !!spec.observeChildren,
        });
      }

      this.#syncForm();
    }

    #teardown(): void {
      this.#observer?.disconnect();
      this.#observer = null;
      for (const cleanup of this.#cleanup.splice(0)) cleanup();
      if (this.component) {
        this.component.destroy();
        this.component.element.remove();
      }
      this.component = null;
      this.#slot = null;
    }

    /** Recreates the component, keeping its live state when asked. */
    #rebuild(keepState: boolean): void {
      if (this.component && keepState) {
        for (const [name, property] of Object.entries(spec.properties ?? {})) {
          this.#pending.set(name, property.get(this.component));
        }
      }
      this.#teardown();
      if (this.isConnected) this.#build();
    }

    #syncForm(): void {
      const form = spec.form;
      const internals = this.internals;
      if (!form || !internals || !this.component) return;
      const value = form.value(this.component);
      if (form.state) internals.setFormValue(value, form.state(this.component));
      else internals.setFormValue(value);
      const control = form.control?.(this.component);
      if (control) internals.setValidity(control.validity, control.validationMessage, control);
    }
  }

  const proto = MElement.prototype as unknown as Record<string, unknown>;
  for (const [name, attribute] of Object.entries(spec.attributes ?? {})) {
    const property = camel(name);
    if (property in proto || spec.properties?.[property]) continue;
    Object.defineProperty(proto, property, {
      configurable: true,
      get(this: HTMLElement) {
        return read(this, name, attribute.type);
      },
      set(this: HTMLElement, value: unknown) {
        write(this, name, attribute.type, value);
      },
    });
  }
  for (const name of Object.keys(spec.properties ?? {})) {
    Object.defineProperty(proto, name, {
      configurable: true,
      get(this: MElement) {
        return this.getProperty(name);
      },
      set(this: MElement, value: unknown) {
        this.setProperty(name, value);
      },
    });
  }
  for (const name of spec.methods ?? []) {
    Object.defineProperty(proto, name, {
      configurable: true,
      value(this: MElement, ...args: unknown[]) {
        return this.callMethod(name, args);
      },
    });
  }
  return MElement;
};

/**
 * The class of a declaration element (`<m-tab>`): it renders nothing, and each
 * declared attribute has a property that reads and writes it. Frameworks that set
 * a custom element's props as properties (Solid always does) then reach the
 * attributes its parent reads, as frameworks that set attributes already did.
 * Called on first use, never at import.
 */
export const createDeclarationClass = (
  attributes: Record<string, { type: AttributeType }>
): CustomElementConstructor => {
  const names = Object.keys(attributes).map(camel);
  class Declaration extends HTMLElement {
    // A property set before the element was defined is an own property that hides
    // the accessor: move it onto the attribute, as the elements do on upgrade.
    connectedCallback(): void {
      const self = this as unknown as Record<string, unknown>;
      for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(this, name)) {
          const value = self[name];
          delete self[name];
          self[name] = value;
        }
      }
    }
  }
  for (const [name, attribute] of Object.entries(attributes)) {
    Object.defineProperty(Declaration.prototype, camel(name), {
      configurable: true,
      get(this: HTMLElement) {
        return read(this, name, attribute.type);
      },
      set(this: HTMLElement, value: unknown) {
        write(this, name, attribute.type, value);
      },
    });
  }
  return Declaration;
};

/** A spec with its element class and registration. */
export interface ElementDefinition<C extends ElementComponent> {
  spec: ElementSpec<C>;
  /** The element class, built on first access. Browser only. */
  readonly element: CustomElementConstructor;
  /** Registers the element; a repeated call is a no-op. Returns the tag. Browser only. */
  define: (options?: DefineOptions) => string;
}

/**
 * Creates the definition for a spec. Nothing is built or registered until
 * `element` or `define()` is used, so the module can be imported on a server.
 */
export const defineElement = <C extends ElementComponent>(spec: ElementSpec<C>): ElementDefinition<C> => {
  let element: CustomElementConstructor | null = null;
  const getElement = (): CustomElementConstructor => (element ??= createElementClass(spec));
  const registered = new Set<CustomElementConstructor>();
  let prepared = false;

  return {
    spec,
    get element() {
      return getElement();
    },
    define(options: DefineOptions = {}) {
      const tag = `${options.prefix ?? DEFAULT_PREFIX}-${spec.name}`;
      // Once per definition: framework adapters call define() on every mount,
      // and registering again would drop the shared host stylesheet.
      if (!prepared) {
        prepared = true;
        registerStyles({ [`host:${spec.name}`]: BASE_HOST_STYLES + (spec.hostStyles ?? "") });
        const missing = [...SHADOW_BASE_STYLES, ...spec.styles].filter((name) => !hasStyles(name));
        if (missing.length) {
          console.warn(`<${tag}> has no CSS for ${missing.join(", ")}: import "mtrl/elements/css/${spec.name}" first.`);
        }
      }
      const existing = customElements.get(tag);
      if (existing) {
        if (!registered.has(existing)) {
          console.warn(`<${tag}> is already defined by another script; keeping the first definition.`);
        }
        return tag;
      }
      // A constructor registers once per registry: another prefix needs its own subclass.
      const base = getElement();
      const ctor: CustomElementConstructor = registered.size === 0 ? base : class extends base {};
      customElements.define(tag, ctor);
      registered.add(ctor);
      return tag;
    },
  };
};

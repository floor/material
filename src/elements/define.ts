// src/elements/define.ts
/**
 * `defineElement` turns a component factory into a custom element.
 *
 * The element owns one factory instance, built inside its shadow root on first
 * connection. Attributes are the component's defaults, as on native controls;
 * properties carry its live state. The model's attribute (`checked`, `value`)
 * moves the live state until the state is dirty: changed by the user or set by
 * script, as a native input's dirty value and checkedness flags. Factory
 * events are re-dispatched from the host under the same names.
 *
 * Every piece of the component is a CSS part named after its BEM class
 * without the prefix: the block by its name (`mtrl-button` is
 * `::part(button)`), an element by its element name (`mtrl-switch__track` is
 * `::part(track)`). The piece holding the slot also takes the slot
 * attribute's name, so `m-button::part(label)` is the button's label.
 *
 * Nothing here touches the DOM at import time: the element class is built on
 * first use, so every element module can be imported on a server.
 *
 * @module elements
 */

import { PREFIX } from "../core/config";
import { applyStyles, DEFAULT_PREFIX, hasStyles, registerStyles, usePreupgradePrefix } from "./styles";

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
  /**
   * The event reports a change of state beside the model (`open`,
   * `expanded`), not of the model: dispatching it leaves the element clean.
   */
  state?: boolean;
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
  /**
   * The value submitted with the form under the host's `name`; FormData
   * submits its own entries instead (several values); null submits nothing.
   */
  value: (component: C, host: HTMLElement) => string | FormData | null;
  /** The inner control whose validity the element reports. */
  control?: (component: C) => HTMLInputElement | HTMLTextAreaElement | null;
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
  /** The model was changed by the user or by script: its attributes no longer move it. */
  readonly dirty: boolean;
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
  /**
   * The live property two-way binding drives (`v-model`, Svelte's `bind:`).
   * Its attribute (the kebab-cased name) is its default: see `defaults`.
   */
  model?: string;
  /**
   * Live properties beyond `model` whose attribute is their default the same
   * way (the slider's `secondValue` and `second-value`). A change of such an
   * attribute moves the live state until the element is dirty, and a form
   * reset returns to it.
   */
  defaults?: readonly string[];
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

export { DEFAULT_PREFIX };

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
const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

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

const CLASS_PREFIX = `${PREFIX}-`;

/**
 * A node's part names: its BEM classes without the prefix, a block class by
 * its block (`mtrl-button` is `button`, `mtrl-ripple` is `ripple`) and an
 * element class by its element (`mtrl-button__icon` is `icon`,
 * `mtrl-switch__track` is `track`). Modifiers (`--`) and unprefixed state
 * classes name no part.
 */
const partNames = (node: Element): string[] => {
  const names: string[] = [];
  for (const name of Array.from(node.classList)) {
    if (!name.startsWith(CLASS_PREFIX) || /--/.test(name)) continue;
    const bem = name.slice(CLASS_PREFIX.length);
    const at = bem.indexOf("__");
    const part = at < 0 ? bem : bem.slice(at + 2);
    if (!names.includes(part)) names.push(part);
  }
  return names;
};

const hasContent = (host: HTMLElement): boolean =>
  Array.from(host.childNodes).some(
    (node) => node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? "").trim() !== "")
  );

/** The element class for a spec. Called on first use, never at import. */
const createElementClass = <C extends ElementComponent>(spec: ElementSpec<C>): CustomElementConstructor => {
  // The live properties an attribute is the default of, and those attributes.
  const backed = [...(spec.model ? [spec.model] : []), ...(spec.defaults ?? [])];
  const backing = new Set(backed.map(kebab));

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
    /** The model was changed by the user or by script: its attributes no longer move it. */
    #dirty = false;
    #cleanup: Array<() => void> = [];
    #observer: MutationObserver | null = null;
    #parts: MutationObserver | null = null;
    #slot: HTMLSlotElement | null = null;

    get dirty(): boolean {
      return this.#dirty;
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open", delegatesFocus: true });
      this.internals = spec.form && typeof this.attachInternals === "function" ? this.attachInternals() : null;
      if (backed.length) {
        // Every event the host dispatches, from the factory or a spec's setup,
        // reports a user change: silent changes dispatch nothing. A state
        // event reports one beside the model.
        for (const [event, eventSpec] of Object.entries(spec.events ?? {})) {
          if (eventSpec.state) continue;
          this.addEventListener(event, (e) => {
            if (e.target === this) this.#dirty = true;
          });
        }
      }
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
      if (spec.slot && name === spec.slot.attribute) {
        // The slot's fallback text; a component built without a slot is rebuilt to place one.
        if (this.#slot) this.#slot.textContent = next ?? "";
        else if (next) this.#rebuild(true);
        return;
      }
      const attribute = spec.attributes?.[name];
      if (!attribute) return;
      // A default no longer moves a dirty state; a reset reads it again.
      if (this.#dirty && backing.has(name)) return;
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
      this.#dirty = false;
      this.#pending.clear();
      this.#rebuild(false);
    }

    formStateRestoreCallback(state: unknown): void {
      if (typeof state !== "string" || !spec.form?.restore) return;
      this.#dirty = true; // a restored state is the user's, as natively
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
      if (backed.includes(name)) this.#dirty = true;
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
      const before = backed.map((property) => this.getProperty(property));
      const result = (method as (...a: unknown[]) => unknown).apply(component, args);
      // A method that moves the model (`toggle()`, `select()`) sets it by script.
      if (backed.some((property, i) => this.getProperty(property) !== before[i])) this.#dirty = true;
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
      const names = [
        ...Object.keys(spec.attributes ?? {}).map(camel),
        ...Object.keys(spec.properties ?? {}),
        ...(spec.slot ? [camel(spec.slot.attribute)] : []),
      ];
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
      this.#exposeParts(root);
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
          // Declarations changing is not the user: what the update makes the
          // factory emit (a removed chip's `remove`) is not re-dispatched.
          let updated = false;
          const component = this.component;
          if (typeof observe === "function" && component) {
            this.#quietly(() => {
              updated = observe(this, component);
            });
          }
          if (updated) {
            this.#syncForm(); // an in-place update can change the form value (a removed selection)
            return;
          }
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

    /**
     * Names the component's pieces as parts (see `partNames`); the element
     * holding the slot also takes the slot attribute's name (`label`). Nodes
     * the component adds later are named as they arrive. The observer watches
     * `childList` only, never `class`, so state-class toggles (hover, press,
     * ripple, `--selected`) cost no callback; parts come from block and
     * element classes, which no component swaps on a node it has inserted.
     */
    #exposeParts(root: ShadowRoot): void {
      const name = (node: Element): void => {
        const names = partNames(node);
        if (spec.slot && this.#slot?.parentElement === node && !names.includes(spec.slot.attribute)) {
          names.push(spec.slot.attribute);
        }
        const value = names.join(" ");
        if ((node.getAttribute("part") ?? "") === value) return;
        if (value) node.setAttribute("part", value);
        else node.removeAttribute("part");
      };
      const nameAll = (node: Element): void => {
        name(node);
        for (const child of Array.from(node.querySelectorAll("*"))) name(child);
      };
      for (const child of Array.from(root.children)) nameAll(child);
      this.#parts ??= new MutationObserver((records) => {
        for (const record of records) {
          for (const node of Array.from(record.addedNodes)) if (node.nodeType === 1) nameAll(node as Element);
        }
      });
      this.#parts.observe(root, { childList: true, subtree: true });
    }

    #teardown(): void {
      this.#observer?.disconnect();
      this.#observer = null;
      this.#parts?.disconnect();
      for (const cleanup of this.#cleanup.splice(0)) cleanup();
      if (this.component) {
        this.component.destroy();
        this.component.element.remove();
      }
      this.component = null;
      this.#slot = null;
    }

    /**
     * Recreates the component, keeping its live state when asked. A clean
     * model's state is its attributes', which the new component reads again.
     */
    #rebuild(keepState: boolean): void {
      if (this.component && keepState) {
        for (const [name, property] of Object.entries(spec.properties ?? {})) {
          if (!this.#dirty && backed.includes(name)) continue;
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
      const value = form.value(this.component, this);
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
  if (spec.slot) {
    // The slot's attribute as a property, as `label` on a native <option>: it
    // reads the attribute, else the element's text. Setting it writes the
    // attribute, whose change updates the text.
    const { attribute } = spec.slot;
    const property = camel(attribute);
    if (!(property in proto) && !spec.properties?.[property]) {
      Object.defineProperty(proto, property, {
        configurable: true,
        get(this: HTMLElement) {
          return this.getAttribute(attribute) ?? (this.textContent ?? "").trim();
        },
        set(this: HTMLElement, value: unknown) {
          write(this, attribute, "string", value);
        },
      });
    }
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
      // Elements of this prefix not defined yet keep their box meanwhile.
      if (options.prefix) usePreupgradePrefix(options.prefix);
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

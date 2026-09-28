// src/vue/create.ts
/**
 * Vue components over the elements.
 *
 * `createComponent` renders the element's tag. Attributes are props, rendered
 * as attributes so server markup carries them; live-state properties
 * (`checked`, `value`) are props the component writes to the element, with
 * `update:<name>` events so `v-model:checked` works, and the spec's model
 * property doubles as `modelValue` so plain `v-model` works; the attribute a
 * live property shadows is its `default*` prop. Element events are Vue events
 * of the same name. The element registers on mount, never at import.
 *
 * @module vue
 */

import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  type DefineSetupFnComponent,
  type FunctionalComponent,
} from "vue";
import type { DefineOptions, ElementEvents, ElementProperties, ElementProps } from "../elements";
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
  type ModelOf,
} from "../elements/adapter";

export { configure } from "../elements/adapter";

/** `modelValue` for the spec's model property, so plain `v-model` binds it. */
export type ModelProps<S> = [ModelOf<S>] extends [never]
  ? Record<never, never>
  : { modelValue?: ElementProperties<S>[ModelOf<S>] };

/** Props of a generated component. */
export type VueProps<S> = ElementProps<S> & DefaultProps<S> & FormProps<S> & ModelProps<S>;

/** Its events: the element's, and `update:*` for two-way binding. */
export type VueEmits<S> = {
  [K in keyof ElementEvents<S> & string]: (event: ElementEvents<S>[K]) => true;
} & {
  [K in keyof ElementProperties<S> & string as `update:${K}`]: (value: NonNullable<ElementProperties<S>[K]>) => true;
} & ([ModelOf<S>] extends [never]
    ? Record<never, never>
    : { "update:modelValue": (value: NonNullable<ElementProperties<S>[ModelOf<S>]>) => true });

/**
 * What a generated component's template ref exposes besides Vue's instance:
 * `ref<InstanceType<typeof MSwitch> & Exposed<SwitchElement>>()`.
 */
export interface Exposed<E extends HTMLElement> {
  readonly element: E | null;
}

/**
 * A generated component; named so declarations stay short. `_E` is the
 * element its template ref exposes as `element` (see `Exposed`).
 */
export type MComponent<S, _E extends HTMLElement> = DefineSetupFnComponent<VueProps<S>, VueEmits<S>>;

/** A generated declaration component. */
export type MDeclaration<A> = FunctionalComponent<A>;

const accept = (): true => true;

/**
 * The Vue component for an element.
 * @param spec - The element's spec (`switchElement.spec`)
 * @param define - Registers the element and anything it needs (`defineSwitch`)
 */
export const createComponent = <S, E extends HTMLElement>(
  spec: ComponentSpec,
  define: (options?: DefineOptions) => string,
  name: string
): MComponent<S, E> => {
  const described = describe(spec);
  const { attributes, properties, events, model, form } = described;
  const props = [...attributes.keys(), ...properties, ...(model ? ["modelValue"] : []), ...(form ? ["name"] : [])];
  const emits = Object.fromEntries(
    [...events, ...properties.map((p) => `update:${p}`), ...(model ? ["update:modelValue"] : [])].map((e) => [e, accept])
  );

  const component = defineComponent(
    (raw: Record<string, unknown>, { emit, slots, expose }) => {
      const props = raw;
      const element = ref<E | null>(null);
      expose({
        get element() {
          return element.value;
        },
      });

      /** A live property's value from its props: `modelValue` stands in for the model property. */
      const live = (property: string): unknown =>
        property === model && props.modelValue !== undefined ? props.modelValue : props[property];

      const host = (): Record<string, unknown> => {
        const result: Record<string, unknown> = { ref: element };
        for (const [key, attribute] of attributes) {
          const value = toAttribute(attribute.type, props[key]);
          // Vue writes a key the element has as a property; a shadowed
          // attribute (`checked`) shares its name with the live property, so
          // the browser gets it as an attribute below instead.
          if (attribute.shadowed && isBrowser) continue;
          result[attribute.name] = value;
        }
        if (!isBrowser) for (const [name, value] of serverDefaults(described, live)) result[name] ??= value;
        if (form && props.name !== undefined) result.name = props.name;
        return result;
      };

      const sync = (): void => {
        const el = element.value;
        if (!el) return;
        writeDefaults(el, described, (key) => props[key]);
        writeLive(el, described, live);
      };

      const listeners: Array<() => void> = [];
      onMounted(() => {
        const el = element.value;
        if (!el) return;
        sync();
        define({ prefix: getPrefix() });
        sync();
        for (const event of events) {
          const listener = (e: Event): void => {
            emit(event, e);
            const target = el as unknown as Record<string, unknown>;
            for (const property of properties) {
              const value = target[property];
              if (value !== live(property)) {
                emit(`update:${property}`, value);
                if (property === model) emit("update:modelValue", value);
              }
            }
          };
          el.addEventListener(event, listener);
          listeners.push(() => el.removeEventListener(event, listener));
        }
      });
      onUpdated(sync);
      onBeforeUnmount(() => listeners.splice(0).forEach((remove) => remove()));

      return () => h(`${getPrefix()}-${spec.name}`, host(), slots.default?.());
    },
    { name, props, emits }
  );
  return component as unknown as MComponent<S, E>;
};

/** The Vue component for a declaration child; its parent registers the tag. */
export const createDeclaration = <A>(spec: DeclarationSpec, name: string): MDeclaration<A> => {
  const attributes = describeDeclaration(spec);
  const component: FunctionalComponent<A> = (props, { slots, attrs }) => {
    const host: Record<string, unknown> = { ...attrs };
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      const attribute = attributes.get(key);
      if (attribute) host[attribute.name] = toAttribute(attribute.type, value);
    }
    return h(`${getPrefix()}-${spec.name}`, host, slots.default?.());
  };
  component.displayName = name;
  component.props = [...attributes.keys()] as unknown as FunctionalComponent<A>["props"];
  return component;
};

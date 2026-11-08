import type { ElementComponent } from '../../../core/compose/component';
import { fieldOf } from './field';
import type { PrefixTextFeature } from './prefix-text';
import type { SuffixTextFeature } from './suffix-text';

interface TextSlotConfig {
  prefix?: string;
  componentName?: string;
  prefixText?: string;
  suffixText?: string;
}

interface TextSlotComponent extends ElementComponent {
  lifecycle?: { destroy: () => void };
}

/** Private DOM state shared by the two independently reported text slots. */
export function createTextSlot<C extends TextSlotComponent>(config: TextSlotConfig, component: C, side: 'prefix'): C & PrefixTextFeature;
export function createTextSlot<C extends TextSlotComponent>(config: TextSlotConfig, component: C, side: 'suffix'): C & SuffixTextFeature;
export function createTextSlot(
  config: TextSlotConfig,
  component: TextSlotComponent,
  side: 'prefix' | 'suffix',
): unknown {
  const prefix = config.prefix || 'mtrl';
  const name = config.componentName || 'text-field';
  let slot: HTMLElement | null = null;

  const ensure = (): HTMLElement => {
    if (slot && slot.parentNode) return slot;
    const element = document.createElement('span');
    element.className = `${prefix}-${name}__${side}`;
    fieldOf(component).appendChild(element);
    component.element.classList.add(`${prefix}-${name}--with-${side}`);
    slot = element;
    return element;
  };

  const key = `${side}Text` as 'prefixText' | 'suffixText';
  if (config[key]) ensure().textContent = config[key]!;

  if ('lifecycle' in component && component.lifecycle?.destroy) {
    const originalDestroy = component.lifecycle.destroy;
    component.lifecycle.destroy = () => {
      slot?.remove();
      slot = null;
      originalDestroy.call(component.lifecycle);
    };
  }

  const member = `${side}TextElement`;
  const title = side === 'prefix' ? 'Prefix' : 'Suffix';
  return {
    ...component,
    // A data property survives the subsequent feature spreads. The methods
    // update the finished object's report through their live receiver.
    [member]: slot,
    [`set${title}Text`](this: Record<string, unknown>, text: string) {
      this[member] = ensure();
      (this[member] as HTMLElement).textContent = text;
      return this;
    },
    [`remove${title}Text`](this: Record<string, unknown>) {
      if (slot) {
        slot.remove();
        slot = null;
        component.element.classList.remove(`${prefix}-${name}--with-${side}`);
        this[member] = null;
      }
      return this;
    },
  };
}

import type { ElementComponent } from '../../../core/compose/component';
import { fieldOf } from './field';

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
export const createTextSlot = (
  config: TextSlotConfig,
  component: TextSlotComponent,
  side: 'prefix' | 'suffix',
) => {
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

  return {
    initial: slot,
    ensure,
    remove(): boolean {
      if (!slot) return false;
      slot.remove();
      slot = null;
      component.element.classList.remove(`${prefix}-${name}--with-${side}`);
      return true;
    },
  };
};

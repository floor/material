// src/components/dialog/config.ts
import { 
  createComponentConfig, 
  createElementConfig
} from '../../core/config/component';
import { DialogConfig } from './types';
import { supportsTopLayer } from '../../core/dom/layer';

/**
 * Default configuration for the Dialog component
 */
export const defaultConfig: DialogConfig = {
  size: 'medium',
  animation: 'scale',
  footerAlignment: 'right',
  open: false,
  closeOnOverlayClick: true,
  closeOnEscape: true,
  modal: true,
  autofocus: true,
  trapFocus: true,
  divider: false,  // Default to no divider
  buttons: []
};

/**
 * Creates the base configuration for Dialog component
 * @param {DialogConfig} config - User provided configuration
 * @returns {DialogConfig} Complete configuration with defaults applied
 */
export const createBaseConfig = (config: DialogConfig = {}): DialogConfig => {
  const merged = createComponentConfig(defaultConfig, config, 'dialog') as DialogConfig;
  // Without showModal() the dialog keeps its overlay, so the features only
  // ever see a top layer they can use
  if (merged.layer === 'top' && !supportsTopLayer('modal')) merged.layer = undefined;
  return merged;
};

/**
 * Generates element configuration for the Dialog component
 * @param {DialogConfig} config - Dialog configuration
 * @returns {Object} Element configuration object for withElement
 */
export const getElementConfig = (config: DialogConfig) => {
  // The dialog itself carries the semantics, not the scrim behind it. On the
  // web a basic dialog is an alert dialog (M3 dialog accessibility,
  // "Labeling elements"); a full-screen dialog holds a task rather than a
  // prompt, so it stays a plain dialog.
  const role =
    config.role ||
    (config.size === 'fullscreen' ? 'dialog' : 'alertdialog');

  const attributes: Record<string, string | number> = {
    role,
    tabindex: -1
  };
  if (config.modal !== false) {
    attributes['aria-modal'] = 'true';
  }

  // `title` is the headline: passed on, it became the native tooltip over
  // the whole surface. The headline names it through aria-labelledby.
  return createElementConfig({ ...config, title: undefined }, {
    // In the top layer the dialog is a native <dialog>, shown with showModal()
    tag: config.layer === 'top' ? 'dialog' : 'div',
    attributes,
    className: config.class
  });
};

export default defaultConfig;

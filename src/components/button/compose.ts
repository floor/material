// src/components/button/compose.ts
import { pipe } from "../../core/compose";
import { createBase, withElement } from "../../core/compose/component";
import {
  withEvents,
  withText,
  withIcon,
  withVariant,
  withSize,
  withRipple,
  withDisabled,
  withLifecycle,
} from "../../core/compose/features";
import { withToggle } from "./features/toggle";
import { withAPI } from "./api";
import { ButtonConfig, ButtonComponent } from "./types";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config";

/** Where createButton inserts withProgress. A caller that never loads progress
 * passes nothing, so that chunk stays out of its graph. The feature's own
 * enhancer is generic over its input, which is narrower than this step, so
 * createButton casts it: the pipe already hands it the button it expects. */
type ProgressStep = (config: ButtonConfig) => (component: ButtonComponent) => ButtonComponent;

const identity: ProgressStep = () => (component) => component;

/**
 * Builds a button without deciding whether progress is reachable.
 * The step runs where createButton runs it: after the ripple, before the
 * shape class and the API.
 */
export const composeButton = (
  config: ButtonConfig = {},
  progress: ProgressStep = identity,
  isolated = false,
): ButtonComponent => {
  const baseConfig = createBaseConfig(config, isolated);
  return pipe(
    createBase,
    withEvents(),
    withElement(getElementConfig(baseConfig)),
    withVariant(baseConfig),
    withSize(baseConfig),
    withText(baseConfig),
    withIcon(baseConfig),
    withDisabled(baseConfig),
    withToggle(baseConfig),
    withRipple(baseConfig),
    withLifecycle(),
    // The same generic step withProgress is. The pipe's overloads infer one
    // component type through it.
    progress(baseConfig) as <C>(component: C) => C,
    (component) => {
      if (baseConfig.shape && component.element) {
        const className = `${baseConfig.prefix}-${baseConfig.componentName}--${baseConfig.shape}`;
        component.element.classList.add(className);
      }
      return component;
    },
    (comp) => withAPI(getApiConfig(comp))(comp),
  )(baseConfig);
};

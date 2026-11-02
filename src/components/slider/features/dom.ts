import { createElement } from "../../../core/dom/create";
import { setStyles } from "../../../core/dom/utils";
import { createFormValue } from "../../../core/dom/form-value";
import { SliderConfig } from "../types";
import { ElementComponent } from "../../../core/compose/component";

/**
 * Creates the inner slider DOM structure using optimized createElement
 * This works alongside withElement to create slider-specific inner elements
 *
 * @param config Slider configuration
 * @returns Component enhancement function
 */
export const withDom =
  (config: SliderConfig) =>
  <T extends ElementComponent>(
    component: T,
  ): T & {
    container: HTMLElement;
    handle: HTMLElement;
    valueBubble: HTMLElement;
    secondHandle?: HTMLElement;
    secondValueBubble?: HTMLElement;
    formFields: (HTMLInputElement | null)[] | null;
  } => {
    // Get prefixed class names
    const getClass = (className: string) => component.getClass(className);

    // Set default values
    const min = config.min || 0;
    const max = config.max || 100;
    const value = config.value !== undefined ? config.value : min;
    const isDisabled = config.disabled === true;
    const formatter = config.valueFormatter || ((val) => val.toString());

    // Create the slider container inside the main element
    const container = createElement({
      tag: "div",
      className: getClass("slider__container"),
      container: component.element,
    });

    // Apply styles using setStyles
    setStyles(container, {
      position: "relative", // For track and handle positioning
    });

    // Build accessible label for handles
    const label = config.label || "";
    const handleLabel = config.range && label ? `${label} minimum` : label;
    const secondHandleLabel = label ? `${label} maximum` : "";

    // An accessible handle: a div with the slider role, its value on ARIA, and
    // its position from the value. The two handles differed only in the value,
    // the index and the label, written out twice.
    const handleElement = (index: 0 | 1, handleValue: number, name: string): HTMLElement => {
      const attributes: Record<string, string> = {
        role: "slider",
        "aria-valuemin": String(min),
        "aria-valuemax": String(max),
        "aria-valuenow": String(handleValue),
        "aria-orientation": config.orientation === "vertical" ? "vertical" : "horizontal",
        tabindex: isDisabled ? "-1" : "0",
        "aria-disabled": isDisabled ? "true" : "false",
        "data-value": String(handleValue),
        "data-handle-index": String(index),
      };

      if (name) {
        attributes["aria-label"] = name;
      }

      const element = createElement({
        tag: "div",
        className: getClass("slider__handle"),
        attributes,
        container: container,
      });

      setStyles(element, {
        left: `${((handleValue - min) / (max - min)) * 100}%`,
      });
      return element;
    };

    // A value indicator: decorative text, hidden from assistive technology,
    // which reads the handle's aria-valuenow instead.
    const bubbleElement = (index: 0 | 1, bubbleValue: number): HTMLElement => {
      const element = createElement({
        tag: "div",
        className: getClass("slider__value"),
        attributes: {
          "aria-hidden": "true",
          "data-handle-index": String(index),
        },
        text: formatter(bubbleValue),
        container: container,
      });

      setStyles(element, {
        left: `${((bubbleValue - min) / (max - min)) * 100}%`,
      });
      return element;
    };

    const handle = handleElement(0, value, handleLabel);
    const valueBubble = bubbleElement(0, value);

    // Create second handle and value bubble for range sliders
    let secondHandle: HTMLElement | undefined;
    let secondValueBubble: HTMLElement | undefined;

    if (config.range) {
      const secondValue =
        config.secondValue !== undefined ? config.secondValue : max;

      secondHandle = handleElement(1, secondValue, secondHandleLabel);
      secondValueBubble = bubbleElement(1, secondValue);
    }

    // A slider renders no form control of its own, so without these it
    // submits nothing. Nothing is created unless the slider is named; a range
    // slider submits both ends, as `name` and `name-end`.
    const name = config.name;
    const formFields = name
      ? [
          createFormValue(component.element, name, String(value), isDisabled),
          config.range
            ? createFormValue(
                component.element,
                `${name}-end`,
                String(config.secondValue ?? max),
                isDisabled,
              )
            : null,
        ]
      : null;

    // Return enhanced component with inner elements
    return {
      ...component,
      container,
      handle,
      valueBubble,
      secondHandle,
      secondValueBubble,
      formFields,
    };
  };

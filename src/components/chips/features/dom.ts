import { createElement } from "../../../core/dom/create";
import { ChipsConfig } from "../types";

type ChipsLabelPosition = "start" | "end";

/** The chips set's label, behind setLabel/getLabel/setLabelPosition/getLabelPosition. */
export interface ChipsLabelControl {
  setText: (text: string) => void;
  getText: () => string;
  setPosition: (position: ChipsLabelPosition) => void;
  getPosition: () => ChipsLabelPosition;
}
import { ElementComponent } from "../../../core/compose/component";

/**
 * Creates the inner chips DOM structure using optimized createElement
 * This works alongside withElement to create chips-specific inner elements
 *
 * @param config Chips configuration
 * @returns Component enhancement function
 */
export const withDom =
  (config: ChipsConfig) =>
  <T extends ElementComponent>(
    component: T
  ): T & {
    chipContainer: HTMLElement;
    labelControl: ChipsLabelControl;
    getChipContainer: () => HTMLElement;
    getLabel: () => HTMLElement | null;
  } => {
    // Get prefixed class names
    const getClass = (className: string) => component.getClass(className);

    // Set default values
    const hasLabel = config.label && config.label.trim().length > 0;

    let position: ChipsLabelPosition = config.labelPosition === "end" ? "end" : "start";
    const root = component.element;
    const createLabel = (text: string): HTMLElement => {
      const created = createElement({ tag: "label", className: getClass("chips__label"), text });
      // The visible label names the grid; a <label> alone names nothing. FLO-256.
      created.id = `${getClass("chips")}-label-${Math.random().toString(36).slice(2, 9)}`;
      // First in the DOM whatever the position: --label-end moves it with CSS,
      // so the grid's name is read before its chips either way.
      root.insertBefore(created, root.firstChild);
      root.setAttribute("aria-labelledby", created.id);
      return created;
    };
    // The set's classes follow the label: --with-label while there is one, and
    // --label-end only then, as the element config writes them at creation.
    const syncClasses = (): void => {
      root.classList.toggle(getClass("chips--with-label"), !!label);
      root.classList.toggle(getClass("chips--label-end"), !!label && position === "end");
    };

    // Create optional label element
    let label: HTMLElement | undefined = hasLabel ? createLabel(config.label!) : undefined;

    // Create the chips container where individual chips will be added
    const chipContainer = createElement({
      tag: "div",
      className: getClass("chips__container"),
      container: component.element,
    });
    // The grid's one row of chip cells (FLO-261).
    chipContainer.setAttribute("role", "row");

    // The set's label API (FLO-231): setLabel adds, renames or, with an empty
    // text, removes the label, keeping the grid's aria-labelledby in step.
    const labelControl: ChipsLabelControl = {
      setText(text) {
        const value = (text ?? "").trim() ? text : "";
        if (!value) {
          label?.remove();
          label = undefined;
          root.removeAttribute("aria-labelledby");
        } else if (label) {
          label.textContent = value;
        } else {
          label = createLabel(value);
        }
        syncClasses();
      },
      getText: () => label?.textContent ?? "",
      setPosition(next) {
        position = next === "end" ? "end" : "start";
        syncClasses();
      },
      getPosition: () => position,
    };

    // Return enhanced component with inner elements
    return {
      ...component,
      chipContainer,
      labelControl,

      // Add DOM query methods for compatibility
      getChipContainer: () => chipContainer,
      getLabel: () => label || null,
    };
  };

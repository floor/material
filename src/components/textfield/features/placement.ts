import {
  BaseComponent,
  ElementComponent,
} from "../../../core/compose/component";

/**
 * The floated label is Body Small (12sp) drawn from Body Large (16sp)
 * (m3.material.io text fields; Android TextInputLayout's collapsed hint).
 */
const FLOATED_LABEL_SCALE = 0.75;

/**
 * Gap between the floated label and each end of the notch (Android
 * `mtrl_textinput_box_label_cutout_padding`, 4dp).
 */
const NOTCH_PADDING = 4;

/**
 * Extended element component with input field
 */
interface InputElementComponent extends ElementComponent {
  input?: HTMLInputElement | HTMLTextAreaElement;
  lifecycle?: {
    destroy: () => void;
  };
}

/**
 * Component with placement management capabilities
 */
export interface PlacementComponent extends BaseComponent {
  /**
   * Updates positions of all elements in the textfield
   * @returns The component instance for chaining
   */
  updateElementPositions: () => PlacementComponent;
  /** Queue a placement update owned by this component lifecycle. */
  schedulePositionUpdate: () => void;
}

/**
 * Handles dynamic positioning of textfield elements (label, prefix, suffix)
 * This feature should be added last in the pipe to ensure all elements exist
 *
 * @returns Function that enhances a component with dynamic positioning
 */
export const withPlacement =
  () =>
  <C extends InputElementComponent>(component: C): C & PlacementComponent => {
    const PREFIX = component.config.prefix || "mtrl";
    const COMPONENT = component.config.componentName || "textfield";

    let destroyed = false;
    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    const schedulePositionUpdate = () => {
      if (destroyed) return;
      if (updateTimer !== null) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        updateTimer = null;
        updateElementPositions();
      }, 10);
    };

    const classObservers = new WeakMap<HTMLElement, MutationObserver>();
    let labelObserver: ResizeObserver | null = null;

    const outlineClass = `${PREFIX}-${COMPONENT}__outline`;
    let outline: HTMLElement | null = null;
    let notch: HTMLElement | null = null;

    /**
     * Builds the outline the outlined variant draws its container with: a
     * leading corner, a notch the floating label sits in, and the trailing
     * rest. The notch leaves a gap in the top edge instead of painting over
     * it, so the field shows whatever is behind it. Inserted after the input
     * so the stylesheet can open the notch from the input's own state.
     */
    const ensureOutline = () => {
      if (outline) return;
      outline = document.createElement("div");
      outline.className = outlineClass;
      outline.setAttribute("aria-hidden", "true");
      for (const part of ["leading", "notch", "trailing"]) {
        const segment = document.createElement("div");
        segment.className = `${outlineClass}-${part}`;
        outline.appendChild(segment);
        if (part === "notch") notch = segment;
      }
      if (component.input && component.input.parentNode === component.element)
        component.input.after(outline);
      else component.element.appendChild(outline);
    };

    if (
      component.element.classList.contains(`${PREFIX}-${COMPONENT}--outlined`)
    )
      ensureOutline();

    /**
     * Updates positions of labels and adjusts input padding
     * to accommodate prefix/suffix elements
     */
    const updateElementPositions = () => {
      if (destroyed || !component.element || !component.element.isConnected)
        return component;

      // Get necessary elements
      const labelEl = component.element.querySelector(
        `.${PREFIX}-${COMPONENT}__label`
      ) as HTMLElement;
      const prefixEl = component.element.querySelector(
        `.${PREFIX}-${COMPONENT}__prefix`
      );
      const suffixEl = component.element.querySelector(
        `.${PREFIX}-${COMPONENT}__suffix`
      );

      // Get component states
      const isOutlined = component.element.classList.contains(
        `${PREFIX}-${COMPONENT}--outlined`
      );
      const isFocused = component.element.classList.contains(
        `${PREFIX}-${COMPONENT}--focused`
      );
      const isEmpty = component.element.classList.contains(
        `${PREFIX}-${COMPONENT}--empty`
      );
      const hasLeadingIcon = component.element.classList.contains(
        `${PREFIX}-${COMPONENT}--with-leading-icon`
      );

      // Size the notch to the floated label and open it while the label floats
      if (isOutlined) {
        ensureOutline();
        // The direction as computed, which reaches into a shadow root where
        // the stylesheet's [dir] selectors do not
        component.element.classList.toggle(
          `${PREFIX}-${COMPONENT}--rtl`,
          getComputedStyle(component.element).direction === "rtl"
        );
      }
      if (outline && notch) {
        // offsetWidth is the label's untransformed width, so this holds
        // mid-transition too
        const labelWidth = labelEl ? labelEl.offsetWidth : 0;
        if (labelWidth > 0) {
          notch.style.width = `${
            labelWidth * FLOATED_LABEL_SCALE + NOTCH_PADDING * 2
          }px`;
        }
        outline.classList.toggle(
          `${outlineClass}--notched`,
          isOutlined && !!labelEl && (isFocused || !isEmpty)
        );
      }

      // Handle prefix positioning and input padding
      if (prefixEl && component.input) {
        const prefixWidth = prefixEl.getBoundingClientRect().width + 4; // 4px spacing
        const inputPadding = prefixWidth + 12; // 12px additional padding

        // Update input left padding
        component.input.style.paddingLeft = `${inputPadding}px`;

        // Update label position if present
        if (labelEl) {
          let labelPosition = inputPadding;

          // Account for leading icon if present
          if (hasLeadingIcon) {
            labelPosition = Math.max(labelPosition, 44);
          }

          // Different positioning strategy based on variant and state
          if (!isFocused && isEmpty) {
            // When unfocused and empty, align with prefix/input
            labelEl.style.left = `${labelPosition}px`;
          } else {
            // When focused or filled, move to default position: the
            // stylesheet's for outlined, where the notch expects the label
            labelEl.style.left = isOutlined ? "" : "12px";
          }
        }
      } else if (hasLeadingIcon && labelEl && isOutlined) {
        // The stylesheet places the label by the icon at rest and at the
        // start of the notch when floated, per density and direction
        labelEl.style.left = "";
      }

      // Handle suffix positioning and input padding
      if (suffixEl && component.input) {
        const suffixWidth = suffixEl.getBoundingClientRect().width + 4; // 4px spacing
        const inputPadding = suffixWidth + 12; // 12px additional padding

        // Update input right padding
        component.input.style.paddingRight = `${inputPadding}px`;
      }

      return component;
    };

    // Set up event listeners for dynamic positioning
    const setupEventListeners = () => {
      // Watch for class changes on the component element
      // This ensures we update positions when state changes (empty, focused, etc.)
      const classObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            // Debounce the update to avoid excessive recalculations
            schedulePositionUpdate();
          }
        });
      });

      // Observe class changes on the component element
      classObserver.observe(component.element, {
        attributes: true,
        attributeFilter: ["class"],
      });

      // Update positions on window resize
      window.addEventListener("resize", updateElementPositions);

      // Store the observer for cleanup
      classObservers.set(component.element, classObserver);

      // The notch follows the label's width: its text, density and fonts
      // loading, and a field first laid out after being hidden
      const labelEl = component.element.querySelector(
        `.${PREFIX}-${COMPONENT}__label`
      );
      if (labelEl && typeof ResizeObserver !== "undefined") {
        labelObserver = new ResizeObserver(schedulePositionUpdate);
        labelObserver.observe(labelEl);
      }
    };

    // Perform initial setup
    const initialization = setTimeout(() => {
      if (destroyed) return;
      setupEventListeners();
      updateElementPositions();
    }, 0);

    // Add lifecycle integration
    if ("lifecycle" in component && component.lifecycle?.destroy) {
      const originalDestroy = component.lifecycle.destroy;
      component.lifecycle.destroy = () => {
        if (destroyed) return;
        destroyed = true;
        clearTimeout(initialization);
        if (updateTimer !== null) clearTimeout(updateTimer);
        updateTimer = null;
        window.removeEventListener("resize", updateElementPositions);

        // Disconnect class observer
        const classObserver = classObservers.get(component.element);
        if (classObserver) {
          classObserver.disconnect();
          classObservers.delete(component.element);
        }

        labelObserver?.disconnect();
        labelObserver = null;

        originalDestroy.call(component.lifecycle);
      };
    }

    return {
      ...component,
      schedulePositionUpdate,
      updateElementPositions: () => {
        updateElementPositions();
        return component as unknown as C & PlacementComponent;
      },
    };
  };

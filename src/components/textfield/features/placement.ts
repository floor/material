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
 * The fields waiting for a placement pass, each a read that returns its
 * write. Fields scheduled in the same task are measured together, then
 * written together: one layout for all of them, not one per field, whose
 * reads and writes interleaved (FLO-335).
 */
const pending = new Set<() => () => void>();
let flushing: ReturnType<typeof setTimeout> | null = null;

const flush = (): void => {
  flushing = null;
  const reads = [...pending];
  pending.clear();
  const writes = reads.map((read) => read());
  for (const write of writes) write();
};

const schedule = (read: () => () => void): void => {
  pending.add(read);
  flushing ??= setTimeout(flush, 0);
};

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
    // This field's pass in the shared batch; the Set runs it once however
    // often it is scheduled before the flush
    const schedulePositionUpdate = () => {
      if (destroyed) return;
      schedule(measure);
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
      // Beside the input, in the field (FLO-300)
      if (component.input) component.input.after(outline);
      else component.element.appendChild(outline);
    };

    if (
      component.element.classList.contains(`${PREFIX}-${COMPONENT}--outlined`)
    )
      ensureOutline();

    /**
     * Reads what placing the label, the notch and the prefix and suffix
     * needs, and returns the write that applies it: the batch runs every
     * field's read before any field's write (FLO-335).
     */
    const measure = (): (() => void) => {
      if (destroyed || !component.element || !component.element.isConnected) return () => {};
      const element = component.element;
      const labelEl = element.querySelector<HTMLElement>(`.${PREFIX}-${COMPONENT}__label`);
      const prefixEl = element.querySelector(`.${PREFIX}-${COMPONENT}__prefix`);
      const suffixEl = element.querySelector(`.${PREFIX}-${COMPONENT}__suffix`);
      const has = (modifier: string): boolean => element.classList.contains(`${PREFIX}-${COMPONENT}--${modifier}`);
      const isOutlined = has("outlined");
      const isFocused = has("focused");
      const isEmpty = has("empty");
      const hasLeadingIcon = has("with-leading-icon");

      // Reads. The direction as computed, which reaches into a shadow root
      // where the stylesheet's [dir] selectors do not; offsetWidth is the
      // label's untransformed width, so it holds mid-transition too.
      const rtl = isOutlined ? getComputedStyle(element).direction === "rtl" : false;
      const labelWidth = isOutlined && labelEl ? labelEl.offsetWidth : 0;
      const prefixWidth = prefixEl && component.input ? prefixEl.getBoundingClientRect().width : null;
      const suffixWidth = suffixEl && component.input ? suffixEl.getBoundingClientRect().width : null;

      return () => {
        if (destroyed) return;
        // Size the notch to the floated label and open it while the label floats
        if (isOutlined) {
          ensureOutline();
          element.classList.toggle(`${PREFIX}-${COMPONENT}--rtl`, rtl);
        }
        if (outline && notch) {
          if (labelWidth > 0) notch.style.width = `${labelWidth * FLOATED_LABEL_SCALE + NOTCH_PADDING * 2}px`;
          outline.classList.toggle(`${outlineClass}--notched`, isOutlined && !!labelEl && (isFocused || !isEmpty));
        }

        // The prefix: input padding and, at rest, the label beside it
        if (prefixWidth !== null && component.input) {
          const inputPadding = prefixWidth + 4 + 12; // 4px spacing, 12px padding
          component.input.style.paddingLeft = `${inputPadding}px`;
          if (labelEl) {
            if (!isFocused && isEmpty) {
              // When unfocused and empty, align with prefix/input
              labelEl.style.left = `${hasLeadingIcon ? Math.max(inputPadding, 44) : inputPadding}px`;
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

        // The suffix: input padding
        if (suffixWidth !== null && component.input) {
          component.input.style.paddingRight = `${suffixWidth + 4 + 12}px`; // 4px spacing, 12px padding
        }
      };
    };

    /** Places the elements now: this field's read, then its write. */
    const updateElementPositions = () => {
      measure()();
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

    // Perform initial setup: observers now, the first placement in the
    // next batch with the other fields created in this task
    setupEventListeners();
    schedulePositionUpdate();

    // Add lifecycle integration
    if ("lifecycle" in component && component.lifecycle?.destroy) {
      const originalDestroy = component.lifecycle.destroy;
      component.lifecycle.destroy = () => {
        if (destroyed) return;
        destroyed = true;
        pending.delete(measure);
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

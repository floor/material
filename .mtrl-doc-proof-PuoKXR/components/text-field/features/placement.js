const FLOATED_LABEL_SCALE = 0.75;
const NOTCH_PADDING = 4;
const pending = new Set();
let flushing = null;
const flush = () => {
    flushing = null;
    const reads = [...pending];
    pending.clear();
    const writes = reads.map((read) => read());
    for (const write of writes)
        write();
};
const schedule = (read) => {
    pending.add(read);
    flushing ??= setTimeout(flush, 0);
};
export const withPlacement = () => (component) => {
    const PREFIX = component.config.prefix || "mtrl";
    const COMPONENT = component.config.componentName || "text-field";
    let destroyed = false;
    let listening = false;
    const ensureListening = () => {
        if (listening || destroyed)
            return;
        listening = true;
        setupEventListeners();
    };
    const schedulePositionUpdate = () => {
        if (destroyed)
            return;
        ensureListening();
        schedule(measure);
    };
    const classObservers = new WeakMap();
    let labelObserver = null;
    const outlineClass = `${PREFIX}-${COMPONENT}__outline`;
    let outline = null;
    let notch = null;
    const ensureOutline = () => {
        if (outline)
            return;
        outline = document.createElement("div");
        outline.className = outlineClass;
        outline.setAttribute("aria-hidden", "true");
        for (const part of ["leading", "notch", "trailing"]) {
            const segment = document.createElement("div");
            segment.className = `${outlineClass}-${part}`;
            outline.appendChild(segment);
            if (part === "notch")
                notch = segment;
        }
        if (component.input)
            component.input.after(outline);
        else
            component.element.appendChild(outline);
    };
    if (component.element.classList.contains(`${PREFIX}-${COMPONENT}--outlined`))
        ensureOutline();
    const measure = () => {
        if (destroyed || !component.element || !component.element.isConnected)
            return () => { };
        const element = component.element;
        const labelEl = element.querySelector(`.${PREFIX}-${COMPONENT}__label`);
        const prefixEl = element.querySelector(`.${PREFIX}-${COMPONENT}__prefix`);
        const suffixEl = element.querySelector(`.${PREFIX}-${COMPONENT}__suffix`);
        const has = (modifier) => element.classList.contains(`${PREFIX}-${COMPONENT}--${modifier}`);
        const isOutlined = has("outlined");
        const isFocused = has("focused");
        const isEmpty = has("empty");
        const rtl = globalThis.getComputedStyle?.(element).direction === "rtl";
        const labelWidth = isOutlined && labelEl ? labelEl.offsetWidth : 0;
        const affixes = [prefixEl, suffixEl].map((affix) => affix?.getBoundingClientRect().width);
        return () => {
            if (destroyed)
                return;
            if (isOutlined)
                ensureOutline();
            element.classList.toggle(`${PREFIX}-${COMPONENT}--rtl`, rtl);
            if (outline && notch) {
                if (labelWidth > 0)
                    notch.style.width = `${labelWidth * FLOATED_LABEL_SCALE + NOTCH_PADDING * 2}px`;
                outline.classList.toggle(`${outlineClass}--notched`, isOutlined && !!labelEl && (isFocused || !isEmpty));
            }
            affixes.forEach((width, end) => {
                if (width !== undefined)
                    element.style.setProperty(`--${PREFIX}-${COMPONENT}-${end ? "suffix" : "prefix"}-width`, `${width}px`);
            });
        };
    };
    const updateElementPositions = () => {
        ensureListening();
        measure()();
        return component;
    };
    const setupEventListeners = () => {
        const classObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "attributes" &&
                    mutation.attributeName === "class") {
                    schedulePositionUpdate();
                }
            });
        });
        classObserver.observe(component.element, {
            attributes: true,
            attributeFilter: ["class"],
        });
        window.addEventListener("resize", updateElementPositions);
        classObservers.set(component.element, classObserver);
        const labelEl = component.element.querySelector(`.${PREFIX}-${COMPONENT}__label`);
        if (labelEl && typeof ResizeObserver !== "undefined") {
            labelObserver = new ResizeObserver(schedulePositionUpdate);
            labelObserver.observe(labelEl);
        }
    };
    const has = (modifier) => component.element.classList.contains(`${PREFIX}-${COMPONENT}--${modifier}`);
    const needsPlacement = has("outlined") ||
        has("with-leading-icon") ||
        component.element.querySelector(`.${PREFIX}-${COMPONENT}__prefix, .${PREFIX}-${COMPONENT}__suffix`) !== null;
    const inShadowRoot = () => (component.element.getRootNode().host ? measure() : () => { });
    if (needsPlacement)
        schedulePositionUpdate();
    else
        schedule(inShadowRoot);
    if ("lifecycle" in component && component.lifecycle?.destroy) {
        const originalDestroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            if (destroyed)
                return;
            destroyed = true;
            pending.delete(measure);
            pending.delete(inShadowRoot);
            if (!pending.size && flushing !== null) {
                clearTimeout(flushing);
                flushing = null;
            }
            window.removeEventListener("resize", updateElementPositions);
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
            return component;
        },
    };
};

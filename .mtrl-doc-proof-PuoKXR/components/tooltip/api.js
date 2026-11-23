import { TOOLTIP_POSITIONS, DEFAULT_OFFSET, } from "./types.js";
import { TOOLTIP_DEFAULTS } from "./constants.js";
import { hideFromTopLayer, showInTopLayer } from "../../core/dom/layer.js";
const EXIT_DURATION = 150;
export const withAPI = ({ lifecycle }) => (component) => {
    let target = null;
    const config = component.config ?? {};
    let position = (config.position ?? TOOLTIP_DEFAULTS.POSITION);
    let isVisible = false;
    let showTimer = null;
    let hideTimer = null;
    const showDelay = config.showDelay ?? TOOLTIP_DEFAULTS.SHOW_DELAY;
    const hideDelay = config.hideDelay ?? TOOLTIP_DEFAULTS.HIDE_DELAY;
    const showOnFocus = config.showOnFocus !== false;
    const showOnHover = config.showOnHover !== false;
    const topLayer = config.layer === "top";
    let layerTimer = null;
    const describe = (el) => {
        const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
        if (!ids.includes(component.element.id))
            ids.push(component.element.id);
        el.setAttribute("aria-describedby", ids.join(" "));
    };
    const undescribe = (el) => {
        const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id && id !== component.element.id);
        if (ids.length)
            el.setAttribute("aria-describedby", ids.join(" "));
        else
            el.removeAttribute("aria-describedby");
    };
    const arrowElement = document.createElement("div");
    arrowElement.className = `${component.getClass("tooltip")}__arrow`;
    component.element.appendChild(arrowElement);
    if (topLayer)
        component.element.setAttribute("popover", "manual");
    else
        document.body.appendChild(component.element);
    component.element.setAttribute("aria-hidden", "true");
    const calculatePosition = () => {
        if (!target)
            return { top: 0, left: 0 };
        component.element.style.left = "0px";
        const styles = getComputedStyle(component.element);
        const tooltipWidth = parseFloat(styles.width);
        const tooltipHeight = parseFloat(styles.height);
        const targetRect = target.getBoundingClientRect();
        const offset = DEFAULT_OFFSET;
        let top = 0;
        let left = 0;
        const [side, anchor] = position.split("-");
        const vertical = side !== "left" && side !== "right";
        const align = anchor === "start" ? 0 : anchor === "end" ? 1 : 0.5;
        if (vertical) {
            top = side === "top"
                ? targetRect.top - tooltipHeight - offset
                : targetRect.bottom + offset;
            left = targetRect.left + (targetRect.width - tooltipWidth) * align;
        }
        else {
            left = side === "left"
                ? targetRect.left - tooltipWidth - offset
                : targetRect.right + offset;
            top = targetRect.top + (targetRect.height - tooltipHeight) * align;
        }
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        let suffix = anchor ? `-${anchor}` : "";
        if (vertical) {
            if (top < 0)
                top = targetRect.bottom + offset;
            else if (top + tooltipHeight > windowHeight) {
                top = targetRect.top - tooltipHeight - offset;
            }
        }
        const clampedX = left < 0 || left + tooltipWidth > windowWidth;
        const clampedY = top < 0 || top + tooltipHeight > windowHeight;
        left = Math.max(0, Math.min(windowWidth - tooltipWidth, left));
        top = Math.max(0, Math.min(windowHeight - tooltipHeight, top));
        if (vertical ? clampedX : clampedY) {
            const from = vertical ? left : top;
            const size = vertical ? tooltipWidth : tooltipHeight;
            const targetFrom = vertical ? targetRect.left : targetRect.top;
            const targetTo = vertical ? targetRect.right : targetRect.bottom;
            const spanAt = [from + 8, from + size / 2 - 8, from + size - 24];
            const meet = spanAt.findIndex((x) => x + 16 > targetFrom && x < targetTo);
            suffix = ["-start", "", "-end"][meet < 0 ? 2 : meet];
        }
        return {
            top,
            left,
            arrowPosition: (vertical
                ? top + tooltipHeight <= targetRect.top
                    ? "bottom"
                    : "top"
                : left + tooltipWidth <= targetRect.left
                    ? "right"
                    : "left") + suffix,
        };
    };
    const addTargetEvents = (targetEl) => {
        if (showOnHover) {
            targetEl.addEventListener("mouseenter", handleTargetMouseEnter);
            targetEl.addEventListener("mouseleave", handleTargetMouseLeave);
        }
        if (showOnFocus) {
            targetEl.addEventListener("focus", handleTargetFocus);
            targetEl.addEventListener("blur", handleTargetBlur);
        }
        targetEl.addEventListener("pointerdown", press);
        targetEl.addEventListener("click", handleClick);
        targetEl.addEventListener("keydown", handleKeyDown);
    };
    const removeTargetEvents = (targetEl) => {
        if (targetEl) {
            targetEl.removeEventListener("mouseenter", handleTargetMouseEnter);
            targetEl.removeEventListener("mouseleave", handleTargetMouseLeave);
            targetEl.removeEventListener("focus", handleTargetFocus);
            targetEl.removeEventListener("blur", handleTargetBlur);
            targetEl.removeEventListener("pointerdown", press);
            targetEl.removeEventListener("click", handleClick);
            targetEl.removeEventListener("keydown", handleKeyDown);
        }
    };
    const handleTargetMouseEnter = () => {
        if (touchExpiry === undefined)
            api.show();
    };
    const handleTargetMouseLeave = () => {
        if (touchExpiry === undefined)
            api.hide();
    };
    const handleTooltipMouseEnter = () => {
        if (isVisible && hideTimer !== null)
            api.show(true);
    };
    const handleTooltipMouseLeave = () => {
        if (isVisible)
            api.hide();
    };
    component.element.addEventListener("mouseenter", handleTooltipMouseEnter);
    component.element.addEventListener("mouseleave", handleTooltipMouseLeave);
    const handleDocumentKeydown = (event) => {
        if (event.key === "Escape" && isVisible)
            api.hide(true);
    };
    let pressed = false;
    let touchPointer;
    let touchHold;
    let touchExpiry;
    const menuOpen = () => target?.getAttribute("aria-expanded") === "true";
    const dismiss = () => api.hide(true);
    const dismissOutsideTouch = (event) => {
        if (!event.composedPath().includes(component.element))
            dismiss();
    };
    const clearTouch = () => {
        window.clearTimeout(touchHold);
        window.clearTimeout(touchExpiry);
        touchPointer = touchHold = touchExpiry = undefined;
        document.removeEventListener("pointerdown", dismissOutsideTouch, true);
    };
    const press = (event) => {
        pressed = true;
        dismiss();
        if (event.pointerType !== "touch" || !event.isPrimary || !(showOnHover || showOnFocus))
            return;
        touchPointer = event.pointerId;
        touchHold = window.setTimeout(() => {
            api.show(true);
            if (!isVisible)
                return;
            touchExpiry = window.setTimeout(dismiss, 1500);
            document.addEventListener("pointerdown", dismissOutsideTouch, true);
        }, 500);
    };
    const release = (event) => {
        pressed = false;
        if (event.pointerId === touchPointer) {
            window.clearTimeout(touchHold);
            touchPointer = touchHold = undefined;
        }
    };
    const handleClick = (event) => {
        if (touchExpiry === undefined || event.pointerType !== "touch")
            dismiss();
    };
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    const handleKeyDown = (event) => {
        if (event.key === "Enter" || event.key === " ")
            dismiss();
    };
    const handleTargetFocus = () => {
        if (!pressed && touchExpiry === undefined)
            api.show();
    };
    const handleTargetBlur = () => api.hide();
    const api = {
        element: component.element,
        target,
        lifecycle,
        getClass: component.getClass,
        setText(text) {
            const contentNode = document.createTextNode(text);
            while (component.element.firstChild &&
                component.element.firstChild !== arrowElement) {
                component.element.removeChild(component.element.firstChild);
            }
            if (arrowElement.parentNode === component.element) {
                component.element.insertBefore(contentNode, arrowElement);
            }
            else {
                component.element.appendChild(contentNode);
            }
            if (isVisible) {
                this.updatePosition();
            }
            return this;
        },
        getText() {
            const clone = component.element.cloneNode(true);
            const arrowClone = clone.querySelector(`.${component.getClass("tooltip")}__arrow`);
            if (arrowClone) {
                arrowClone.remove();
            }
            return clone.textContent || "";
        },
        setPosition(newPosition) {
            position = newPosition;
            const baseClass = component.getClass("tooltip");
            const positionClasses = Object.values(TOOLTIP_POSITIONS).map((p) => `${baseClass}--${p}`);
            component.element.classList.remove(...positionClasses);
            component.element.classList.add(`${baseClass}--${newPosition}`);
            if (isVisible) {
                this.updatePosition();
            }
            return this;
        },
        getPosition() {
            return position;
        },
        setTarget(newTarget) {
            if (touchExpiry === undefined)
                clearTouch();
            else
                dismiss();
            if (target) {
                removeTargetEvents(target);
                undescribe(target);
            }
            target = newTarget;
            this.target = newTarget;
            describe(target);
            if (topLayer && !component.element.isConnected && target.parentNode) {
                target.after(component.element);
            }
            addTargetEvents(target);
            if (isVisible) {
                this.updatePosition();
            }
            return this;
        },
        show(immediate = false) {
            if (menuOpen())
                return this;
            clearTouch();
            if (showTimer !== null) {
                window.clearTimeout(showTimer);
                showTimer = null;
            }
            if (hideTimer !== null) {
                window.clearTimeout(hideTimer);
                hideTimer = null;
            }
            const showTooltip = () => {
                if (!target || menuOpen())
                    return this;
                if (topLayer) {
                    if (layerTimer !== null)
                        window.clearTimeout(layerTimer);
                    layerTimer = null;
                    if (!component.element.isConnected)
                        document.body.appendChild(component.element);
                    showInTopLayer(component.element, { kind: "popover-manual" });
                    void component.element.offsetWidth;
                }
                component.element.setAttribute("aria-hidden", "false");
                component.element.classList.add(`${component.getClass("tooltip")}--visible`);
                isVisible = true;
                this.updatePosition();
                window.addEventListener("resize", handleWindowResize);
                window.addEventListener("scroll", handleWindowScroll, true);
                document.addEventListener("keydown", handleDocumentKeydown);
            };
            if (immediate) {
                showTooltip();
            }
            else {
                showTimer = window.setTimeout(showTooltip, showDelay);
            }
            return this;
        },
        hide(immediate = false) {
            clearTouch();
            if (hideTimer !== null) {
                window.clearTimeout(hideTimer);
                hideTimer = null;
            }
            if (showTimer !== null) {
                window.clearTimeout(showTimer);
                showTimer = null;
            }
            const hideTooltip = () => {
                component.element.setAttribute("aria-hidden", "true");
                component.element.classList.remove(`${component.getClass("tooltip")}--visible`);
                isVisible = false;
                window.removeEventListener("resize", handleWindowResize);
                window.removeEventListener("scroll", handleWindowScroll, true);
                document.removeEventListener("keydown", handleDocumentKeydown);
                if (topLayer) {
                    if (layerTimer !== null)
                        window.clearTimeout(layerTimer);
                    layerTimer = window.setTimeout(() => {
                        layerTimer = null;
                        if (!isVisible)
                            hideFromTopLayer(component.element);
                    }, EXIT_DURATION);
                }
            };
            if (immediate) {
                hideTooltip();
            }
            else {
                hideTimer = window.setTimeout(hideTooltip, hideDelay);
            }
            return this;
        },
        isVisible() {
            return isVisible;
        },
        updatePosition() {
            if (!target)
                return this;
            const { top, left, arrowPosition } = calculatePosition();
            component.element.style.top = `${top}px`;
            component.element.style.left = `${left}px`;
            if (arrowPosition) {
                arrowElement.className = `${component.getClass("tooltip")}__arrow`;
                arrowElement.classList.add(`${component.getClass("tooltip")}__arrow--${arrowPosition}`);
            }
            return this;
        },
        destroy() {
            clearTouch();
            if (showTimer !== null) {
                window.clearTimeout(showTimer);
            }
            if (hideTimer !== null) {
                window.clearTimeout(hideTimer);
            }
            if (layerTimer !== null) {
                window.clearTimeout(layerTimer);
            }
            if (target) {
                removeTargetEvents(target);
                undescribe(target);
            }
            window.removeEventListener("resize", handleWindowResize);
            window.removeEventListener("scroll", handleWindowScroll, true);
            document.removeEventListener("keydown", handleDocumentKeydown);
            document.removeEventListener("pointerup", release, true);
            document.removeEventListener("pointercancel", release, true);
            component.element.removeEventListener("mouseenter", handleTooltipMouseEnter);
            component.element.removeEventListener("mouseleave", handleTooltipMouseLeave);
            if (component.element.parentNode) {
                component.element.parentNode.removeChild(component.element);
            }
            lifecycle.destroy();
        },
    };
    const handleWindowResize = () => {
        api.updatePosition();
    };
    const handleWindowScroll = () => {
        api.updatePosition();
    };
    return api;
};
export default withAPI;

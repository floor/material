import { processClassNames } from "../../core/config/component.js";
import { registerTab, syncTabControls, tabIdFor } from "./utils.js";
import { pipe } from "../../core/compose/index.js";
import { createBase } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { isEmptyBadgeLabel } from "../badge/config.js";
import { TAB_LAYOUT } from "./constants.js";
import { createTabConfig } from "./config.js";
import createButton from "../button/index.js";
import createBadge from "../badge/index.js";
export const createTab = (config = {}) => {
    const baseConfig = createTabConfig(config);
    try {
        const baseComponent = pipe(createBase, withEvents(), withLifecycle())(baseConfig);
        const button = createButton({
            text: baseConfig.text,
            icon: baseConfig.icon,
            iconSize: baseConfig.iconSize,
            disabled: baseConfig.disabled,
            ariaLabel: baseConfig.ariaLabel,
            ripple: baseConfig.ripple !== false,
            rippleConfig: {
                duration: 400,
                ...(baseConfig.rippleConfig || {}),
            },
            value: baseConfig.value,
            prefix: baseConfig.prefix,
            variant: "text",
            class: [
                `${baseConfig.prefix}-tab`,
                processClassNames(baseConfig.className || ""),
            ].filter(Boolean).join(" "),
        });
        baseComponent.element = button.element;
        baseComponent.element.setAttribute("role", "tab");
        baseComponent.element.setAttribute("aria-selected", baseConfig.state === "active" ? "true" : "false");
        if (baseConfig.value) {
            baseComponent.element.setAttribute("id", tabIdFor(baseConfig.groupId ?? "", baseConfig.value));
            registerTab(baseComponent.element, baseConfig.groupId ?? "", baseConfig.value);
            syncTabControls(baseComponent.element);
        }
        if (baseConfig.state === "active") {
            baseComponent.element.classList.add(`${baseComponent.getClass("tab")}--active`);
        }
        button.on("click", (event) => {
            if (baseComponent.emit) {
                baseComponent.emit("click", event);
            }
        });
        for (const type of ["focus", "blur"]) {
            button.element.addEventListener(type, (event) => baseComponent.emit?.(type, event));
        }
        const badgeAnchor = () => button.element.querySelector(`.${baseComponent.getClass("button__icon")},.${baseComponent.getClass("button__text")}`) ?? button.element;
        const hasBadgeToShow = (badge) => badge.element.classList.contains(`${badge.getClass("badge")}--small`) ||
            !isEmptyBadgeLabel(badge.getContent());
        const tab = {
            ...baseComponent,
            button,
            element: button.element,
            on(event, handler) {
                baseComponent.on(event, handler);
                return this;
            },
            off(event, handler) {
                baseComponent.off(event, handler);
                return this;
            },
            badge: undefined,
            getValue() {
                return button.getValue();
            },
            setValue(value) {
                const safeValue = value || "";
                button.setValue(safeValue);
                this.element.setAttribute("id", tabIdFor(baseConfig.groupId ?? "", safeValue));
                registerTab(this.element, baseConfig.groupId ?? "", safeValue);
                syncTabControls(this.element);
                announceBadge();
                return this;
            },
            activate() {
                this.element.classList.add(`${this.getClass("tab")}--active`);
                this.element.setAttribute("aria-selected", "true");
                const event = new CustomEvent("tab:activated", {
                    bubbles: true,
                    detail: { value: this.getValue() },
                });
                this.element.dispatchEvent(event);
                return this;
            },
            deactivate() {
                this.element.classList.remove(`${this.getClass("tab")}--active`);
                this.element.setAttribute("aria-selected", "false");
                return this;
            },
            isActive() {
                return this.element.classList.contains(`${this.getClass("tab")}--active`);
            },
            enable() {
                button.enable();
                this.element.removeAttribute("aria-disabled");
                return this;
            },
            disable() {
                button.disable();
                this.element.setAttribute("aria-disabled", "true");
                return this;
            },
            isDisabled() {
                return button.isDisabled();
            },
            setText(content) {
                button.setText(content);
                this.updateLayoutStyle();
                announceBadge();
                return this;
            },
            getText() {
                return button.getText();
            },
            setAriaLabel(label) {
                baseConfig.ariaLabel = label;
                announceBadge();
                return this;
            },
            setIcon(icon) {
                button.setIcon(icon);
                this.updateLayoutStyle();
                return this;
            },
            getIcon() {
                return button.getIcon();
            },
            setBadge(content) {
                if (!this.badge) {
                    const badgeConfig = {
                        label: content,
                        standalone: false,
                        target: badgeAnchor(),
                        prefix: baseConfig.prefix,
                        ...(baseConfig.badgeConfig || {}),
                    };
                    this.badge = createBadge(badgeConfig);
                    this.badge.element.setAttribute("aria-hidden", "true");
                }
                else {
                    this.badge.setContent(content);
                    if (hasBadgeToShow(this.badge)) {
                        this.badge.show();
                    }
                }
                this.element.setAttribute("data-has-badge", this.badge && hasBadgeToShow(this.badge) ? "true" : "false");
                announceBadge();
                return this;
            },
            getBadge() {
                return this.badge ? this.badge.getContent() : "";
            },
            showBadge() {
                if (this.badge && hasBadgeToShow(this.badge)) {
                    this.badge.show();
                    this.element.setAttribute("data-has-badge", "true");
                }
                announceBadge();
                return this;
            },
            hideBadge() {
                if (this.badge) {
                    this.badge.hide();
                    this.element.setAttribute("data-has-badge", "false");
                }
                announceBadge();
                return this;
            },
            getBadgeComponent() {
                return this.badge;
            },
            destroy() {
                if (this.badge) {
                    this.badge.destroy();
                }
                if (button.destroy) {
                    button.destroy();
                }
                baseComponent.lifecycle.destroy();
            },
            updateLayoutStyle() {
                const hasText = !!this.getText();
                const hasIcon = !!this.getIcon();
                let layoutClass = "";
                if (hasText && hasIcon) {
                    layoutClass = TAB_LAYOUT.ICON_AND_TEXT;
                }
                else if (hasIcon) {
                    layoutClass = TAB_LAYOUT.ICON_ONLY;
                }
                else {
                    layoutClass = TAB_LAYOUT.TEXT_ONLY;
                }
                Object.values(TAB_LAYOUT).forEach((layout) => {
                    this.element.classList.remove(`${this.getClass("tab")}--${layout}`);
                });
                this.element.classList.add(`${this.getClass("tab")}--${layoutClass}`);
                const wrapper = this.badge?.wrapper;
                const anchor = badgeAnchor();
                if (wrapper && anchor !== this.element && wrapper.firstElementChild !== anchor) {
                    wrapper.replaceWith(...wrapper.childNodes);
                    this.badge?.attachTo(anchor);
                }
            },
        };
        const announceBadge = () => {
            const count = tab.badge?.isVisible()
                ? tab.badge.element.getAttribute("aria-label") || tab.badge.getContent() : "";
            const text = button.getText();
            const label = baseConfig.ariaLabel || text || button.getValue();
            const name = [label, count].filter(Boolean).join(", ");
            if (name !== text || baseConfig.ariaLabel) {
                tab.element.setAttribute("aria-label", name);
            }
            else {
                tab.element.removeAttribute("aria-label");
            }
        };
        if (baseConfig.badge !== undefined) {
            tab.setBadge(baseConfig.badge);
        }
        tab.updateLayoutStyle();
        announceBadge();
        return tab;
    }
    catch (error) {
        console.error("Tab creation error:", error);
        throw new Error(`Failed to create tab: ${error.message}`);
    }
};

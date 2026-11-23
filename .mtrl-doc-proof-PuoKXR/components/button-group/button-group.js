import { pipe } from "../../core/compose/pipe.js";
import { warnUnknownValue } from "../../core/utils/warn.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { createEmitter } from "../../core/state/emitter.js";
import createIconButton from "../icon-button/icon-button.js";
import createButton from "../button/index.js";
import { createBaseConfig, getContainerConfig, getSizeStyles, getButtonConfig } from "./config.js";
import { BUTTON_GROUP_DEFAULTS, BUTTON_GROUP_DENSITY, BUTTON_GROUP_EXPANDED_RATIO, BUTTON_GROUP_COMPRESSION_LIMIT } from "./constants.js";
const createButtonGroup = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    const emitter = createEmitter();
    let currentVariant = baseConfig.variant || BUTTON_GROUP_DEFAULTS.VARIANT;
    let currentOrientation = baseConfig.orientation || BUTTON_GROUP_DEFAULTS.ORIENTATION;
    let currentDensity = baseConfig.density || BUTTON_GROUP_DEFAULTS.DENSITY;
    const kind = baseConfig.kind || BUTTON_GROUP_DEFAULTS.KIND;
    const selection = baseConfig.selection || BUTTON_GROUP_DEFAULTS.SELECTION;
    const required = Boolean(baseConfig.required);
    const selectedValues = new Set();
    try {
        const component = pipe(createBase, withEvents(), withElement(getContainerConfig(baseConfig)), withLifecycle())(baseConfig);
        const applySizeStyles = (density) => {
            component.element.style.removeProperty(`--${baseConfig.prefix}-density`);
            Object.entries(getSizeStyles(baseConfig.prefix, baseConfig.size, kind, density)).forEach(([prop, value]) => {
                component.element.style.setProperty(prop, value);
            });
        };
        applySizeStyles(currentDensity);
        const buttons = [];
        const buttonConfigs = baseConfig.buttons || [];
        const totalButtons = buttonConfigs.length;
        const valueOf = (button) => {
            const config = button._groupConfig;
            return String(config?.value ?? config?.id ?? button._groupIndex);
        };
        const applySelectedState = (button, selected) => {
            const selectedClass = `${baseConfig.prefix}-button-group__button--selected`;
            button.element.classList.toggle(selectedClass, selected);
            button.element.setAttribute('aria-pressed', String(selected));
            const toggleState = button.toggleState;
            if (toggleState?.isToggle?.()) {
                if (selected)
                    toggleState.select();
                else
                    toggleState.deselect();
            }
            else if (typeof button.setSelected === 'function') {
                button.setSelected(selected);
            }
            else {
                if (selected)
                    button.select?.();
                else
                    button.deselect?.();
            }
        };
        const expandedRatio = baseConfig.expandedRatio ?? BUTTON_GROUP_EXPANDED_RATIO;
        const releasePress = () => {
            buttons.forEach(b => {
                b.element.style.width = '';
                b.element.style.minWidth = '';
                b.element.style.maxWidth = '';
                b.element.style.paddingLeft = '';
                b.element.style.paddingRight = '';
            });
            document.removeEventListener('pointerup', releasePress);
            document.removeEventListener('pointercancel', releasePress);
        };
        const pressExpand = (index) => {
            if (kind !== 'standard' || expandedRatio <= 0 || currentOrientation !== 'horizontal')
                return;
            const widths = buttons.map(b => b.element.getBoundingClientRect().width);
            if (!widths[index])
                return;
            const view = component.element.ownerDocument.defaultView;
            const padding = (i, side) => view ? parseFloat(view.getComputedStyle(buttons[i].element)[side]) || 0 : 0;
            const rtl = view?.getComputedStyle(component.element).direction === 'rtl';
            const previous = buttons[index - 1] ? index - 1 : -1;
            const next = buttons[index + 1] ? index + 1 : -1;
            const middle = previous >= 0 && next >= 0;
            const share = expandedRatio * widths[index] / (middle ? 2 : 1);
            let growth = 0;
            const apply = [];
            const compress = (i, side) => {
                const facing = padding(i, side);
                const room = facing > 0
                    ? Math.min(facing, BUTTON_GROUP_COMPRESSION_LIMIT)
                    : BUTTON_GROUP_COMPRESSION_LIMIT;
                const limit = Math.min(share, room, widths[i]);
                if (limit <= 0)
                    return;
                const el = buttons[i].element;
                const to = widths[i] - limit;
                el.style.minWidth = `${to}px`;
                el.style.width = `${widths[i]}px`;
                apply.push(() => {
                    el.style.width = `${to}px`;
                    if (facing > 0)
                        el.style[side] = `${Math.max(0, facing - limit)}px`;
                });
                growth += limit;
            };
            if (previous >= 0)
                compress(previous, rtl ? 'paddingLeft' : 'paddingRight');
            if (next >= 0)
                compress(next, rtl ? 'paddingRight' : 'paddingLeft');
            const pressed = buttons[index].element;
            const to = widths[index] + growth;
            pressed.style.maxWidth = `${to}px`;
            pressed.style.width = `${widths[index]}px`;
            void pressed.offsetWidth;
            apply.forEach(fn => fn());
            pressed.style.width = `${to}px`;
            document.addEventListener('pointerup', releasePress);
            document.addEventListener('pointercancel', releasePress);
        };
        const emitChange = (button, originalEvent) => {
            const selected = buttons.filter(b => selectedValues.has(valueOf(b)));
            const changeEvent = {
                buttonGroup,
                values: selected.map(valueOf),
                value: selection === 'multi' ? selected.map(valueOf) : (selected[0] ? valueOf(selected[0]) : null),
                selected,
                button,
                originalEvent
            };
            emitter.emit('change', changeEvent);
        };
        const setSelected = (value, selected, button, originalEvent) => {
            if (selection === 'none')
                return false;
            const target = buttons.find(b => valueOf(b) === value);
            if (!target)
                return false;
            if (selected === selectedValues.has(value))
                return false;
            if (!selected && required && selectedValues.size === 1)
                return false;
            if (selected && selection === 'single') {
                for (const other of buttons) {
                    const otherValue = valueOf(other);
                    if (otherValue !== value && selectedValues.has(otherValue)) {
                        selectedValues.delete(otherValue);
                        applySelectedState(other, false);
                    }
                }
            }
            if (selected)
                selectedValues.add(value);
            else
                selectedValues.delete(value);
            applySelectedState(target, selected);
            if (button)
                emitChange(button, originalEvent);
            return true;
        };
        buttonConfigs.forEach((buttonConfig, index) => {
            const resolvedConfig = getButtonConfig(buttonConfig, index, totalButtons, baseConfig);
            const selectable = selection !== 'none';
            const button = (buttonConfig.text === undefined && buttonConfig.icon
                ? createIconButton({
                    ...resolvedConfig,
                    ariaLabel: buttonConfig.ariaLabel ?? buttonConfig.value,
                    toggle: selectable,
                    toggleOnClick: false,
                    selectedIcon: buttonConfig.selectedIcon,
                    variant: resolvedConfig.variant === 'text' ? 'standard' : resolvedConfig.variant
                })
                : createButton({
                    ...resolvedConfig,
                    toggle: selectable,
                    toggleOnClick: false
                }));
            button._groupConfig = buttonConfig;
            button._groupIndex = index;
            if (selectable) {
                button.element.setAttribute('aria-pressed', 'false');
            }
            button.element.addEventListener('pointerdown', () => {
                if (!button.disabled?.isDisabled())
                    pressExpand(index);
            });
            button.on('click', ({ originalEvent }) => {
                if (!button.disabled?.isDisabled()) {
                    const groupEvent = {
                        buttonGroup: buttonGroup,
                        button: button,
                        index: index,
                        originalEvent: originalEvent
                    };
                    emitter.emit('click', groupEvent);
                    if (selection !== 'none') {
                        const value = valueOf(button);
                        const isSelected = selectedValues.has(value);
                        if (selection === 'single') {
                            if (!isSelected)
                                setSelected(value, true, button, originalEvent);
                            else if (!required)
                                setSelected(value, false, button, originalEvent);
                        }
                        else {
                            setSelected(value, !isSelected, button, originalEvent);
                        }
                    }
                }
            });
            button.on('focus', ({ originalEvent }) => {
                const groupEvent = {
                    buttonGroup: buttonGroup,
                    button: button,
                    index: index,
                    originalEvent: originalEvent
                };
                emitter.emit('focus', groupEvent);
            });
            button.on('blur', ({ originalEvent }) => {
                const groupEvent = {
                    buttonGroup: buttonGroup,
                    button: button,
                    index: index,
                    originalEvent: originalEvent
                };
                emitter.emit('blur', groupEvent);
            });
            component.element.appendChild(button.element);
            buttons.push(button);
        });
        if (selection !== 'none') {
            buttons.forEach(button => {
                const config = button._groupConfig;
                if (config?.selected && (selection === 'multi' || selectedValues.size === 0)) {
                    selectedValues.add(valueOf(button));
                    applySelectedState(button, true);
                }
            });
        }
        const updateVariant = (variant) => {
            const variantClasses = ['filled', 'tonal', 'outlined', 'elevated', 'text'];
            variantClasses.forEach(v => {
                component.element.classList.remove(`${baseConfig.prefix}-button-group--${v}`);
            });
            component.element.classList.add(`${baseConfig.prefix}-button-group--${variant}`);
            component.element.setAttribute('data-variant', variant);
            buttons.forEach(button => {
                button.setVariant(variant);
            });
            currentVariant = variant;
        };
        const updateOrientation = (orientation) => {
            component.element.classList.remove(`${baseConfig.prefix}-button-group--horizontal`, `${baseConfig.prefix}-button-group--vertical`);
            component.element.classList.add(`${baseConfig.prefix}-button-group--${orientation}`);
            component.element.setAttribute('data-orientation', orientation);
            currentOrientation = orientation;
        };
        const updateDensity = (density) => {
            Object.values(BUTTON_GROUP_DENSITY).forEach(d => {
                if (d !== BUTTON_GROUP_DENSITY.DEFAULT) {
                    component.element.classList.remove(`${baseConfig.prefix}-button-group--density-${d}`);
                }
            });
            if (density !== BUTTON_GROUP_DENSITY.DEFAULT) {
                component.element.classList.add(`${baseConfig.prefix}-button-group--density-${density}`);
            }
            component.element.setAttribute('data-density', density);
            applySizeStyles(density);
            currentDensity = density;
        };
        const buttonGroup = {
            element: component.element,
            buttons,
            getButton(index) {
                return buttons[index];
            },
            getButtonById(id) {
                return buttons.find(button => {
                    const config = button._groupConfig;
                    return config?.id === id || config?.value === id;
                });
            },
            getVariant() {
                return currentVariant;
            },
            setVariant(variant) {
                updateVariant(variant);
                return this;
            },
            getOrientation() {
                return currentOrientation;
            },
            setOrientation(orientation) {
                updateOrientation(orientation);
                return this;
            },
            getDensity() {
                return currentDensity;
            },
            setDensity(density) {
                updateDensity(density);
                return this;
            },
            enable() {
                component.element.classList.remove(`${baseConfig.prefix}-button-group--disabled`);
                buttons.forEach(button => {
                    const config = button._groupConfig;
                    if (!config?.disabled) {
                        button.enable();
                    }
                });
                return this;
            },
            isDisabled() {
                return component.element.classList.contains(`${baseConfig.prefix}-button-group--disabled`);
            },
            disable() {
                component.element.classList.add(`${baseConfig.prefix}-button-group--disabled`);
                buttons.forEach(button => {
                    button.disable();
                });
                return this;
            },
            enableButton(index) {
                const button = buttons[index];
                if (button) {
                    button.enable();
                }
                return this;
            },
            getValue() {
                const values = this.getSelected();
                return selection === 'multi' ? values : (values[0] ?? null);
            },
            getSelected() {
                return buttons.filter(b => selectedValues.has(valueOf(b))).map(valueOf);
            },
            isSelected(value) {
                return selectedValues.has(value);
            },
            select(value) {
                if (selection !== 'none' && !buttons.some(button => valueOf(button) === value)) {
                    warnUnknownValue('button group', value);
                    if (!required)
                        [...selectedValues].forEach(selected => setSelected(selected, false));
                    return this;
                }
                setSelected(value, true);
                return this;
            },
            deselect(value) {
                setSelected(value, false);
                return this;
            },
            toggle(value) {
                setSelected(value, !selectedValues.has(value));
                return this;
            },
            getKind() {
                return kind;
            },
            getSelection() {
                return selection;
            },
            disableButton(index) {
                const button = buttons[index];
                if (button) {
                    button.disable();
                }
                return this;
            },
            on(event, handler) {
                emitter.on(event, handler);
                return this;
            },
            off(event, handler) {
                emitter.off(event, handler);
                return this;
            },
            destroy() {
                releasePress();
                buttons.forEach(button => {
                    button.destroy();
                });
                buttons.length = 0;
                emitter.clear();
                component.lifecycle.destroy();
            }
        };
        if (baseConfig.on?.click)
            buttonGroup.on("click", baseConfig.on.click);
        if (baseConfig.on?.focus)
            buttonGroup.on("focus", baseConfig.on.focus);
        if (baseConfig.on?.blur)
            buttonGroup.on("blur", baseConfig.on.blur);
        if (baseConfig.on?.change)
            buttonGroup.on("change", baseConfig.on.change);
        return buttonGroup;
    }
    catch (error) {
        console.error('Button Group creation error:', error);
        throw new Error(`Failed to create button group: ${error.message}`);
    }
};
export default createButtonGroup;

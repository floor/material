import { LIST_EVENTS } from "../constants.js";
import { getCleanup } from "../../../core/compose/cleanup.js";
import { controlIn } from "./anatomy.js";
export const withSelection = (config) => (component) => {
    const resources = getCleanup(component);
    const selected = new Set();
    const rows = () => component.list?.getRows() ?? [];
    const rowFor = (id) => rows().find(row => row.id === String(id));
    const className = component.getClass("list__item--selected");
    const controlFor = (row) => {
        const slot = row.element.querySelector(`.${component.getClass("list__trailing")}[data-list-control]`);
        return slot ? controlIn(slot) : undefined;
    };
    const isChecked = (control) => control.matches(":checked") || control.getAttribute("aria-checked") === "true";
    const apply = () => {
        for (const id of selected)
            if (!rowFor(id))
                selected.delete(id);
        for (const row of rows()) {
            const checked = selected.has(row.id);
            row.element.classList.toggle(className, checked);
            row.action?.setAttribute("aria-pressed", String(checked));
            const control = controlFor(row);
            if (control && isChecked(control) !== checked) {
                if ("checked" in control) {
                    control.checked = checked;
                    control.dispatchEvent(new Event("change", { bubbles: true }));
                }
                else
                    control.setAttribute("aria-checked", String(checked));
            }
        }
    };
    const update = (id, value) => {
        if (!config.trackSelection || resources.destroyed || !rowFor(id))
            return;
        if (value)
            selected.add(String(id));
        else
            selected.delete(String(id));
        apply();
    };
    const ownedRow = (event) => {
        if (!(event.target instanceof Element))
            return;
        const nearest = event.target.closest(`.${component.getClass("list__item")}`);
        return rows().find(row => row.element === nearest);
    };
    const follow = () => {
        for (const row of rows()) {
            const control = controlFor(row);
            if (!control)
                continue;
            const checked = isChecked(control);
            if (checked === selected.has(row.id))
                continue;
            if (checked && !config.multiSelect)
                selected.clear();
            if (checked)
                selected.add(row.id);
            else
                selected.delete(row.id);
        }
        apply();
    };
    if (config.trackSelection) {
        for (const id of config.initialSelection ?? [])
            if (rowFor(id))
                selected.add(String(id));
        for (const row of rows())
            if (row.item.selected)
                selected.add(row.id);
        follow();
    }
    const activate = (event) => {
        if (!config.trackSelection || resources.destroyed || event.defaultPrevented)
            return;
        const row = ownedRow(event);
        if (!row || row.item.disabled || !(event.target instanceof Element))
            return;
        const control = event.target.closest('button, input, select, textarea, a, [contenteditable="true"], [data-list-control]');
        if (control && control !== row.action) {
            follow();
            return;
        }
        const payload = {
            item: row.item, value: row.id, element: row.element, action: row.action, originalEvent: event,
            component: component.eventTarget?.current ?? component,
            defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
        };
        component.emit?.(LIST_EVENTS.SELECT, payload);
        if (payload.defaultPrevented || resources.destroyed)
            return;
        const trailing = controlFor(row);
        if (trailing) {
            trailing.click();
            follow();
            return;
        }
        const wasSelected = selected.has(row.id);
        if (!config.multiSelect)
            selected.clear();
        if (wasSelected)
            selected.delete(row.id);
        else
            selected.add(row.id);
        apply();
    };
    const blockDisabled = (event) => {
        if (event instanceof KeyboardEvent && event.key === "Tab")
            return;
        if (ownedRow(event)?.item.disabled) {
            event.preventDefault();
            event.stopPropagation();
        }
    };
    const navigate = (event) => {
        if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key))
            return;
        const row = ownedRow(event);
        if (!row?.action || event.target !== row.action)
            return;
        const enabled = rows().filter(value => value.action && !value.item.disabled);
        const current = enabled.indexOf(row);
        const next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : Math.max(0, Math.min(enabled.length - 1, current + (event.key === "ArrowUp" ? -1 : 1)));
        event.preventDefault();
        event.stopPropagation();
        enabled[next]?.action?.focus();
    };
    component.element.addEventListener("click", blockDisabled, true);
    component.element.addEventListener("click", activate);
    component.element.addEventListener("keydown", blockDisabled, true);
    component.element.addEventListener("keydown", navigate);
    if (component.list)
        resources.add(component.list.onRender(apply));
    resources.add(() => {
        component.element.removeEventListener("click", blockDisabled, true);
        component.element.removeEventListener("click", activate);
        component.element.removeEventListener("keydown", blockDisabled, true);
        component.element.removeEventListener("keydown", navigate);
        selected.clear();
    });
    apply();
    return {
        ...component,
        getSelectedItems: () => rows().filter(row => selected.has(row.id)).map(row => row.item),
        getSelectedItemIds: () => Array.from(selected),
        isItemSelected: id => selected.has(String(id)),
        selectItem(id) { update(id, true); return this; },
        deselectItem(id) { update(id, false); return this; },
        clearSelection() { selected.clear(); apply(); return this; },
        setSelection(ids) {
            selected.clear();
            if (config.trackSelection && !resources.destroyed)
                for (const id of ids)
                    if (rowFor(id))
                        selected.add(String(id));
            apply();
            return this;
        },
    };
};
export default withSelection;

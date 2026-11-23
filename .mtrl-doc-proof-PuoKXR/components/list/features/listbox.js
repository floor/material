import { LIST_EVENTS } from "../constants.js";
import { getCleanup } from "../../../core/compose/cleanup.js";
import { itemLabel } from "./anatomy.js";
const INTERACTIVE = 'button,input,select,textarea,a[href],[role=button],[role=switch],[role=checkbox],[data-list-control],[tabindex]:not([tabindex="-1"])';
export const withSingleSelectListbox = (component, options = {}) => {
    const host = component;
    const list = host.list;
    const getClass = host.getClass;
    if (!list || !getClass) {
        throw new Error("[mtrl:list] needs a created list");
    }
    if (host.config?.multiSelect || host.config?.trackSelection === false) {
        throw new Error("[mtrl:list] needs multiSelect off and trackSelection on");
    }
    const resources = getCleanup(host);
    const indicator = options.indicator === "trailing" ? "trailing" : "leading";
    const rowName = getClass("list__item");
    const headlineName = getClass("list__headline");
    const radio = getClass("list__radio");
    let buffer = "";
    let timer;
    let activeId;
    let focusWithin = false;
    let restore = false;
    const rows = () => list.getRows();
    const enabled = () => rows().filter((row) => !row.item.disabled);
    const isSelected = (id) => component.isItemSelected(id);
    const rowOf = (event) => {
        if (!(event.target instanceof Element))
            return;
        const element = event.target.closest(`.${rowName}`);
        return rows().find((row) => row.element === element);
    };
    const label = (row) => (row.element.querySelector(`.${headlineName}`)?.textContent ?? itemLabel(row.item)).trim().toLowerCase();
    const focusRow = (row) => row.element.focus();
    const sync = () => {
        const all = enabled();
        const stop = all.find((row) => isSelected(row.id)) ?? all[0];
        for (const row of rows()) {
            row.element.setAttribute("aria-selected", String(isSelected(row.id)));
            row.element.tabIndex = row === stop ? 0 : -1;
        }
    };
    const press = (row, originalEvent) => {
        if (row.item.disabled) {
            originalEvent.preventDefault();
            return;
        }
        focusRow(row);
        if (isSelected(row.id))
            return;
        const payload = {
            item: row.item,
            value: row.id,
            element: row.element,
            originalEvent,
            component: api,
            defaultPrevented: false,
            preventDefault() {
                this.defaultPrevented = true;
            },
        };
        host.emit?.(LIST_EVENTS.SELECT, payload);
        if (payload.defaultPrevented)
            return;
        component.setSelection([row.id]);
        sync();
    };
    const typeahead = (all, current, key) => {
        if (timer !== undefined)
            clearTimeout(timer);
        buffer += key.toLowerCase();
        timer = setTimeout(() => {
            buffer = "";
            timer = undefined;
        }, 500);
        const repeated = /^(.)\1*$/.test(buffer);
        const needle = repeated ? buffer[0] : buffer;
        const from = repeated ? current + 1 : Math.max(current, 0);
        for (let step = 0; step < all.length; step += 1) {
            const candidate = all[(from + step + all.length) % all.length];
            if (label(candidate).startsWith(needle)) {
                focusRow(candidate);
                return;
            }
        }
    };
    const onClick = (event) => {
        if (event.defaultPrevented)
            return;
        const row = rowOf(event);
        if (!row)
            return;
        event.stopPropagation();
        press(row, event);
    };
    const onKeydown = (event) => {
        if (event.defaultPrevented || event.key === "Tab")
            return;
        const row = rowOf(event);
        if (!row)
            return;
        const all = enabled();
        const current = all.indexOf(row);
        const go = (index) => {
            event.preventDefault();
            event.stopPropagation();
            focusRow(all[index]);
        };
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
        if (step !== undefined) {
            return go(current < 0 ? (step > 0 ? 0 : all.length - 1) : (current + step + all.length) % all.length);
        }
        if (event.key === "Home")
            return go(0);
        if (event.key === "End")
            return go(all.length - 1);
        if (event.key === "Enter" || (event.key === " " && !buffer)) {
            event.preventDefault();
            event.stopPropagation();
            press(row, event);
            return;
        }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            typeahead(all, current, event.key);
        }
    };
    const onFocusIn = (event) => {
        focusWithin = true;
        const row = rowOf(event);
        if (!row)
            return;
        activeId = row.id;
        for (const other of rows())
            other.element.tabIndex = other === row ? 0 : -1;
    };
    const onFocusOut = (event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && component.element.contains(next))
            return;
        focusWithin = false;
        sync();
        if (event.target instanceof Node && !component.element.contains(event.target))
            restore = true;
    };
    const transform = () => {
        component.element.setAttribute("role", "listbox");
        for (const row of rows()) {
            const { element, item } = row;
            if ([item.leading, item.trailing].some((slot) => slot && (slot.type === "control" || slot.type === "custom"))) {
                throw new Error("[mtrl:list] options cannot contain secondary controls");
            }
            if (item[indicator]) {
                throw new Error(`[mtrl:list] indicator "${indicator}" collides with the ${indicator} slot`);
            }
            const action = row.action;
            const labelledby = action?.getAttribute("aria-labelledby") ?? element.querySelector(`.${headlineName}`)?.id;
            const describedby = action?.getAttribute("aria-describedby");
            const name = action?.getAttribute("aria-label") ?? itemLabel(item);
            element.setAttribute(labelledby ? "aria-labelledby" : "aria-label", labelledby ?? (name || element.textContent || "Option"));
            if (describedby)
                element.setAttribute("aria-describedby", describedby);
            element.setAttribute("role", "option");
            if (!element.querySelector(`.${radio}`)) {
                const span = document.createElement("span");
                span.className = radio;
                span.setAttribute("aria-hidden", "true");
                if (indicator === "leading")
                    element.prepend(span);
                else
                    element.append(span);
            }
            action?.remove();
            if (row.action === action)
                row.action = undefined;
            if (element.querySelector(INTERACTIVE)) {
                throw new Error("[mtrl:list] options cannot contain interactive descendants");
            }
        }
        sync();
        if ((focusWithin || restore) && activeId)
            rows().find((row) => row.id === activeId)?.element.focus();
        restore = false;
    };
    const api = {
        ...component,
        async refresh() {
            await component.refresh();
            return api;
        },
        selectItem(id) {
            component.setSelection([id]);
            sync();
            return api;
        },
        deselectItem(id) {
            component.deselectItem(id);
            sync();
            return api;
        },
        clearSelection() {
            component.clearSelection();
            sync();
            return api;
        },
        setSelection(ids) {
            component.setSelection(ids.slice(0, 1));
            sync();
            return api;
        },
    };
    component.element.addEventListener("click", onClick, true);
    component.element.addEventListener("keydown", onKeydown);
    component.element.addEventListener("focusin", onFocusIn);
    component.element.addEventListener("focusout", onFocusOut);
    resources.add(() => {
        component.element.removeEventListener("click", onClick, true);
        component.element.removeEventListener("keydown", onKeydown);
        component.element.removeEventListener("focusin", onFocusIn);
        component.element.removeEventListener("focusout", onFocusOut);
        if (timer !== undefined)
            clearTimeout(timer);
    });
    resources.add(list.onRender(transform));
    transform();
    return api;
};
export default withSingleSelectListbox;

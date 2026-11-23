import { BOTTOM_SHEET_DEFAULTS, BOTTOM_SHEET_EVENTS, BOTTOM_SHEET_STATES, } from "../constants.js";
export const withDrag = () => (component) => {
    const { structure, state } = component;
    const handle = structure.handle;
    if (!handle)
        return { ...component, drag: { release: () => { } } };
    let startY = 0;
    let startTime = 0;
    let offset = 0;
    let dragging = false;
    let dragged = false;
    const label = () => {
        handle.setAttribute("aria-label", state.getState() === BOTTOM_SHEET_STATES.EXPANDED ? "Close sheet" : "Expand sheet");
    };
    const onClick = () => {
        if (dragged) {
            dragged = false;
            return;
        }
        const current = state.getState();
        if (current === BOTTOM_SHEET_STATES.EXPANDED)
            state.close();
        else if (current === BOTTOM_SHEET_STATES.PARTIAL)
            state.setState(BOTTOM_SHEET_STATES.EXPANDED);
        else
            state.open();
    };
    label();
    component.on?.(BOTTOM_SHEET_EVENTS.STATE_CHANGE, label);
    const settle = (distance, velocity) => {
        const current = state.getState();
        const far = Math.abs(distance) >= BOTTOM_SHEET_DEFAULTS.POSITIONAL_THRESHOLD;
        const fast = Math.abs(velocity) >= BOTTOM_SHEET_DEFAULTS.VELOCITY_THRESHOLD;
        if (!far && !fast)
            return current;
        const downwards = distance > 0;
        if (current === BOTTOM_SHEET_STATES.EXPANDED) {
            return downwards ? BOTTOM_SHEET_STATES.PARTIAL : BOTTOM_SHEET_STATES.EXPANDED;
        }
        return downwards ? BOTTOM_SHEET_STATES.HIDDEN : BOTTOM_SHEET_STATES.EXPANDED;
    };
    const onPointerDown = (event) => {
        dragging = true;
        startY = event.clientY;
        startTime = Date.now();
        offset = 0;
        handle.setPointerCapture?.(event.pointerId);
        structure.container.style.transition = "none";
        component.emit(BOTTOM_SHEET_EVENTS.DRAG_START);
    };
    const onPointerMove = (event) => {
        if (!dragging)
            return;
        offset = event.clientY - startY;
        const shown = Math.max(offset, 0);
        structure.container.style.transform = `translateY(${shown}px)`;
    };
    const onPointerUp = (event) => {
        if (!dragging)
            return;
        dragging = false;
        handle.releasePointerCapture?.(event.pointerId);
        const elapsed = Math.max(Date.now() - startTime, 1);
        const velocity = (offset / elapsed) * 1000;
        structure.container.style.transition = "";
        structure.container.style.transform = "";
        dragged = Math.abs(offset) > 4;
        const previous = state.getState();
        const next = settle(offset, velocity);
        if (next === BOTTOM_SHEET_STATES.HIDDEN)
            state.close();
        else
            state.setState(next);
        component.emit(BOTTOM_SHEET_EVENTS.DRAG_END, { state: next, previous });
    };
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("pointermove", onPointerMove);
    handle.addEventListener("pointerup", onPointerUp);
    handle.addEventListener("pointercancel", onPointerUp);
    handle.addEventListener("click", onClick);
    return {
        ...component,
        drag: {
            release: () => {
                handle.removeEventListener("pointerdown", onPointerDown);
                handle.removeEventListener("pointermove", onPointerMove);
                handle.removeEventListener("pointerup", onPointerUp);
                handle.removeEventListener("pointercancel", onPointerUp);
                handle.removeEventListener("click", onClick);
                component.off?.(BOTTOM_SHEET_EVENTS.STATE_CHANGE, label);
            },
        },
    };
};

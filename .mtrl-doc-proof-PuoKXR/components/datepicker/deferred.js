import { createDatePickerShell } from "./shell.js";
const createDeferredSurface = (...input) => {
    const [state, dialog, , , trigger, , isOpen, close, , , emit] = input;
    let real = null;
    let phase = 0;
    const request = () => {
        if (phase)
            return;
        phase = 1;
        import("./surface.js").then(({ createCalendarSurface }) => {
            if (phase === 2)
                return;
            real = createCalendarSurface(...input);
            if (isOpen())
                real[0]();
        }, (error) => {
            if (phase === 2)
                return;
            phase = 0;
            console.error("Date picker load failed:", error);
            close(false);
            if (phase !== 2)
                emit("loaderror", { error });
        });
    };
    if (dialog.getAttribute("aria-modal") === "true" && !dialog.hasAttribute("aria-label"))
        dialog.setAttribute("aria-label", state.label);
    trigger.addEventListener("pointerenter", request, { once: true });
    trigger.addEventListener("focus", request, { once: true });
    return [
        () => {
            if (real)
                real[0]();
            else
                request();
        },
        () => real?.[1](),
        (focus, action) => real?.[2](focus, action),
        event => real?.[3](event),
        event => real?.[4](event),
        () => real?.[5]() ?? true,
        () => { phase = 2; real?.[6](); },
    ];
};
export const createDeferredDatePicker = (config = {}) => createDatePickerShell(config, createDeferredSurface);
export default createDeferredDatePicker;

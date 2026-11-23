import { getThemeColor } from "../../../core/utils/index.js";
import { onThemeChange } from "../../../core/utils/theme.js";
import { PROGRESS_COLORS } from "../constants.js";
const FALLBACKS = {
    indicator: "#6750A4",
    track: "#E8DEF8",
    stop: "#6750A4",
    buffer: "#EADDFF",
};
const read = (element) => ({
    indicator: getThemeColor(PROGRESS_COLORS.INDICATOR, { element, fallback: FALLBACKS.indicator }),
    track: getThemeColor(PROGRESS_COLORS.TRACK, { element, fallback: FALLBACKS.track }),
    stop: getThemeColor(PROGRESS_COLORS.STOP, { element, fallback: FALLBACKS.stop }),
    buffer: getThemeColor(PROGRESS_COLORS.BUFFER, { element, fallback: FALLBACKS.buffer }),
});
export const createColors = (element, onChange) => {
    let colors = FALLBACKS;
    let read_ = false;
    const refresh = () => {
        if (!element.isConnected)
            return;
        try {
            colors = read(element);
            read_ = true;
        }
        catch {
        }
    };
    const update = () => {
        refresh();
        onChange();
    };
    const offThemeChange = onThemeChange(update);
    const observer = typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    observer?.observe(element);
    return {
        get: () => {
            if (!read_)
                refresh();
            return colors;
        },
        refresh,
        destroy: () => {
            observer?.disconnect();
            offThemeChange();
        },
    };
};

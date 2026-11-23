export const isRtl = (element) => {
    const direction = globalThis.getComputedStyle?.(element).direction;
    return direction
        ? direction === "rtl"
        : element.closest("[dir]")?.getAttribute("dir")?.toLowerCase() === "rtl";
};
export const getAxis = (config, rtl = false) => config.orientation === "vertical"
    ? { vertical: true, start: config.topToBottom ? "top" : "bottom", size: "height", cross: "width" }
    : { vertical: false, start: rtl ? "right" : "left", size: "width", cross: "height" };
export const lengthOf = (rect, axis) => axis.vertical ? rect.height : rect.width;
export const offsetAlong = (client, rect, axis) => axis.start === "left" ? client - rect.left
    : axis.start === "right" ? rect.right - client
        : axis.start === "top" ? client - rect.top
            : rect.bottom - client;
export const handleTransform = (axis) => axis.start === "bottom" ? "translate(-50%, 50%)"
    : axis.start === "right" ? "translate(50%, -50%)"
        : "translate(-50%, -50%)";
export const bubbleTransform = (axis) => axis.start === "left" ? "translateX(-50%)"
    : axis.start === "right" ? "translateX(50%)"
        : axis.start === "bottom" ? "translateY(50%)"
            : "translateY(-50%)";
export const arrowSign = (axis) => axis.start === "right" || axis.start === "top" ? -1 : 1;

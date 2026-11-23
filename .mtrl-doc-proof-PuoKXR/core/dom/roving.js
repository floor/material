const NON_TEXT_INPUTS = new Set(["button", "checkbox", "color", "file", "image", "radio", "range", "reset", "submit"]);
export const isTextEditable = (element) => {
    const node = element;
    if (!node || typeof node.localName !== "string")
        return false;
    if (node.isContentEditable)
        return true;
    if (node.localName === "textarea")
        return true;
    return node.localName === "input" && !NON_TEXT_INPUTS.has((node.type || "text").toLowerCase());
};
const isDisabled = (element) => element.matches(":disabled") || element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
export const createRoving = ({ container, targets, vertical = () => false }) => {
    let current = null;
    let chosen = false;
    const enabled = () => targets().filter((target) => !isDisabled(target));
    const owner = (list, node) => list.find((target) => target === node || (node instanceof Node && target.contains(node))) ?? null;
    const sync = () => {
        observer.disconnect();
        const list = enabled();
        if (!chosen || !current || !list.includes(current))
            current = list[0] ?? null;
        for (const target of targets()) {
            target.tabIndex = target === current ? 0 : -1;
            observer.observe(target, { attributeFilter: ["disabled", "aria-disabled"] });
        }
    };
    const onKeydown = (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
            return;
        if (isTextEditable(event.composedPath()[0]))
            return;
        const list = enabled();
        const from = list.indexOf(owner(list, event.target));
        if (from === -1)
            return;
        const rtl = container.matches(":dir(rtl)");
        const isVertical = vertical();
        const back = isVertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
        const forward = isVertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
        let next;
        if (event.key === back)
            next = Math.max(0, from - 1);
        else if (event.key === forward)
            next = Math.min(list.length - 1, from + 1);
        else if (event.key === "Home")
            next = 0;
        else if (event.key === "End")
            next = list.length - 1;
        else
            return;
        event.preventDefault();
        current = list[next];
        chosen = true;
        sync();
        current.focus();
    };
    const onFocusin = (event) => {
        const target = owner(enabled(), event.target);
        if (target) {
            chosen = true;
            if (target !== current) {
                current = target;
                sync();
            }
        }
    };
    const observer = new MutationObserver(sync);
    container.addEventListener("keydown", onKeydown);
    container.addEventListener("focusin", onFocusin);
    sync();
    return {
        sync,
        destroy() {
            observer.disconnect();
            container.removeEventListener("keydown", onKeydown);
            container.removeEventListener("focusin", onFocusin);
        },
    };
};

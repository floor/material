import { setHTML } from "../../../core/dom/html.js";
let nextLabel = 0;
export const itemLabel = (item) => String(item.headline ?? item.text ?? item.title ?? item.name ?? item.id ?? "");
export const isDataItem = (item) => !item.kind || item.kind === "item";
export const itemId = (item, index) => String(item.id ?? index);
export const checkableControl = 'input[type=checkbox],input[type=radio],[role=switch],[role=checkbox],[role=radio]';
const slotContent = (value) => {
    const content = value.content;
    return typeof content === "string" ? content : "element" in content ? content.element : content;
};
export const controlIn = (element) => element.matches(checkableControl) ? element : element.querySelector(checkableControl) ?? undefined;
const hasName = (control) => control.hasAttribute("aria-label") || control.hasAttribute("aria-labelledby") ||
    control.hasAttribute("title") || !!control.labels?.length ||
    (control.textContent ?? "").trim() !== "";
export function renderAnatomy(item, getClass) {
    const row = document.createElement("div");
    const lines = item.lines ?? (item.overline && item.supportingText ? 3 : item.overline || item.supportingText ? 2 : 1);
    row.dataset.lines = String(lines);
    row.classList.add(getClass(`list__item--${["one", "two", "three"][lines - 1]}-line`));
    const text = document.createElement("div");
    text.className = getClass("list__text");
    const appendText = (name, value) => {
        const element = document.createElement("div");
        element.className = getClass(`list__${name}`);
        element.textContent = value;
        text.append(element);
        return element;
    };
    const identifier = `${getClass("list")}-${++nextLabel}`;
    if (item.overline)
        appendText("overline", item.overline);
    const headline = appendText("headline", itemLabel(item));
    headline.id = `${identifier}-headline`;
    const supporting = item.supportingText ? appendText("supporting", item.supportingText) : undefined;
    if (supporting)
        supporting.id = `${identifier}-supporting`;
    const slot = (position, value) => {
        const el = document.createElement("div");
        el.className = `${getClass(`list__${position}`)} ${getClass(`list__${position}--${value.type}`)}`;
        const content = slotContent(value);
        if (value.type === "text")
            el.textContent = typeof content === "string" ? content : content.textContent;
        else if (typeof content === "string")
            setHTML(el, content);
        else
            el.append(content);
        if (value.type === "control" || value.type === "custom")
            el.dataset.listControl = "";
        else if (value.type === "icon")
            el.setAttribute("aria-hidden", "true");
        if (value.type === "control") {
            const control = controlIn(el);
            if (control) {
                const block = getClass("list") + "-";
                const owned = (token) => token.startsWith(block) && /^\d+-(?:headline|supporting)$/.test(token.slice(block.length));
                const reference = control.getAttribute("aria-labelledby");
                const tokens = reference === null ? [] : reference.split(/[ \t\n\f\r]+/);
                const own = tokens.map(token => (owned(token) ? headline.id : token));
                const ours = tokens.some(owned);
                const listName = ours || (reference === null && !hasName(control));
                if (listName)
                    control.setAttribute("aria-labelledby", ours ? own.join(" ") : headline.id);
                const described = control.getAttribute("aria-describedby");
                if (described === null) {
                    if (listName && supporting)
                        control.setAttribute("aria-describedby", supporting.id);
                }
                else {
                    const parts = described.split(/[ \t\n\f\r]+/);
                    if (parts.some(owned)) {
                        const next = parts.map(token => (owned(token) ? (supporting?.id ?? "") : token)).filter(Boolean).join(" ");
                        if (next)
                            control.setAttribute("aria-describedby", next);
                        else
                            control.removeAttribute("aria-describedby");
                    }
                }
            }
        }
        return el;
    };
    if (item.leading)
        row.append(slot("leading", item.leading));
    row.append(text);
    if (item.trailing)
        row.append(slot("trailing", item.trailing));
    return row;
}

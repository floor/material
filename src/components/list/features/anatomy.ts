import { setHTML } from "../../../core/dom/html";
import type { ListItem, ListSlot } from "../types";

let nextLabel = 0;
export const itemLabel = (item: ListItem): string => String(item.headline ?? item.text ?? item.title ?? item.name ?? item.id ?? "");
export const isDataItem = (item: ListItem): boolean => !item.kind || item.kind === "item";
export const itemId = (item: ListItem, index: number): string => String(item.id ?? index);

/** A checkable control: what a trailing slot hands the row's selection to. */
export const checkableControl = 'input[type=checkbox],input[type=radio],[role=switch],[role=checkbox],[role=radio]';

/** A slot's content: the passed node, or a component's own element. */
const slotContent = (value: ListSlot): string | HTMLElement => {
  const content = value.content;
  return typeof content === "string" ? content : "element" in content ? content.element : content;
};

/** The control a slot content holds: itself when checkable, else the first checkable inside it. */
export const controlIn = (element: HTMLElement): HTMLElement | undefined =>
  element.matches(checkableControl) ? element : element.querySelector<HTMLElement>(checkableControl) ?? undefined;

/** Whether the app already named the control, so the row's name must not replace it. */
const hasName = (control: HTMLElement): boolean =>
  control.hasAttribute("aria-label") || control.hasAttribute("aria-labelledby") ||
  control.hasAttribute("title") || !!(control as HTMLInputElement).labels?.length ||
  (control.textContent ?? "").trim() !== "";

/** Standard Compose ListItem anatomy; all interactive slots stay outside the action. */
export function renderAnatomy(item: ListItem, getClass: (name: string) => string): HTMLElement {
  const row = document.createElement("div");
  const lines = item.lines ?? (item.overline && item.supportingText ? 3 : item.overline || item.supportingText ? 2 : 1);
  row.dataset.lines = String(lines);
  row.classList.add(getClass(`list__item--${["one", "two", "three"][lines - 1]}-line`));
  const text = document.createElement("div"); text.className = getClass("list__text");
  const appendText = (name: string, value: string) => {
    const element = document.createElement("div"); element.className = getClass(`list__${name}`);
    element.textContent = value; text.append(element); return element;
  };
  const identifier = `${getClass("list")}-${++nextLabel}`;
  if (item.overline) appendText("overline", item.overline);
  const headline = appendText("headline", itemLabel(item)); headline.id = `${identifier}-headline`;
  const supporting = item.supportingText ? appendText("supporting", item.supportingText) : undefined;
  if (supporting) supporting.id = `${identifier}-supporting`;
  const slot = (position: "leading" | "trailing", value: ListSlot) => {
    const el = document.createElement("div");
    el.className = `${getClass(`list__${position}`)} ${getClass(`list__${position}--${value.type}`)}`;
    const content = slotContent(value);
    if (value.type === "text") el.textContent = typeof content === "string" ? content : content.textContent;
    else if (typeof content === "string") setHTML(el, content);
    else el.append(content);
    if (value.type === "control" || value.type === "custom") el.dataset.listControl = "";
    else if (value.type === "icon") el.setAttribute("aria-hidden", "true");
    if (value.type === "control") {
      // A control with no name of its own borrows the row's, as the row's own
      // action button does; a name the app gave always wins.
      const control = controlIn((el.firstElementChild as HTMLElement | null) ?? el);
      if (control && !hasName(control)) {
        control.setAttribute("aria-labelledby", headline.id);
        if (supporting && !control.hasAttribute("aria-describedby")) control.setAttribute("aria-describedby", supporting.id);
      }
    }
    return el;
  };
  if (item.leading) row.append(slot("leading", item.leading));
  row.append(text);
  if (item.trailing) row.append(slot("trailing", item.trailing));
  return row;
}

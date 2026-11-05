// src/components/list/features/listbox.ts
//
// Single-select listbox mode: the list as a `role="listbox"` of `role="option"`
// rows with `aria-selected`, one roving tab stop, arrow/Home/End/type-ahead
// navigation and radio semantics (pressing the selected option keeps it).
//
// M3 Lists, accessibility: "Container: List box, List item: Option, State:
// Selected or Not-selected"; "The first element in a list should always
// receive focus, unless the list has a selected element"; "All list items
// must be able to be activated using the Space or Enter key". WAI-ARIA APG,
// Listbox Pattern: one tab stop, Down/Up/Home/End move focus, Space/Enter
// select, type-ahead moves focus to the next option with the typed prefix;
// `role="option"` has Children Presentational: True, so nested interactive
// content is refused.
//
// The mode is an enhancer over a created list, not a config branch inside
// createList: an app that does not import it pays nothing for it, and the
// list's own `trackSelection` selection stays the one source of truth (the
// enhancer drives it through the existing selection API and reads it back).
import { LIST_EVENTS } from "../constants";
import { getCleanup, type CleanupScope } from "../../../core/compose/cleanup";
import { itemLabel } from "./anatomy";
import type { ListComponent, ListConfig, ListItem, ListRenderer, ListRow, SelectEvent } from "../types";

/** Options for {@link withSingleSelectListbox}. */
export interface SingleSelectListboxOptions {
  /**
   * Where the visual-only radio indicator sits: before the row's content
   * (`"leading"`, the default) or after it (`"trailing"`). M3 lists position
   * the radio at either end of the item.
   * @default "leading"
   */
  indicator?: "leading" | "trailing";
}

/** A created list carries its merged config and renderer beyond the public type. */
interface ListboxHost {
  config?: Partial<ListConfig<ListItem>>;
  list?: ListRenderer<ListItem>;
  getClass?: (name: string) => string;
  emit?: (event: string, payload: SelectEvent<ListItem>) => unknown;
  resources?: CleanupScope;
  lifecycle?: { destroy(): void };
}

/** What an `option` may not contain: its children are presentational. */
const INTERACTIVE =
  'button,input,select,textarea,a[href],[role=button],[role=switch],[role=checkbox],[data-list-control],[tabindex]:not([tabindex="-1"])';

/**
 * Turns a created list into a single-select listbox (`role="listbox"` with
 * `role="option"` rows, `aria-selected`, a visual-only radio, one tab stop).
 *
 * ```ts
 * const list = withSingleSelectListbox(
 *   createList({ items, ariaLabel: "Ringtone", initialSelection: ["Luna"] }),
 * );
 * ```
 *
 * The list keeps its own selection: `trackSelection` must stay on (the
 * default), and `multiSelect` must be off. Rows are radio options — pressing
 * the selected option again keeps it selected and fires no `select` event;
 * `selectItem`, `deselectItem`, `clearSelection` and `setSelection` still
 * select programmatically. A slot of type `control` or `custom`, another
 * interactive descendant, or a radio indicator on the same side as a slot of
 * the item throws: an `option` cannot contain interactive content.
 *
 * @param component - The created list to enhance
 * @param options - Indicator placement
 * @returns The same list in single-select listbox mode
 */
export const withSingleSelectListbox = (
  component: ListComponent<ListItem>,
  options: SingleSelectListboxOptions = {},
): ListComponent<ListItem> => {
  const host = component as ListComponent<ListItem> & ListboxHost;
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
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeId: string | undefined;
  let focusWithin = false;
  let restore = false;

  const rows = () => list.getRows();
  const enabled = () => rows().filter((row) => !row.item.disabled);
  const isSelected = (id: string) => component.isItemSelected(id);

  /** The list row a click, a key press or a focus event happened in. */
  const rowOf = (event: Event): ListRow<ListItem> | undefined => {
    if (!(event.target instanceof Element)) return;
    const element = event.target.closest(`.${rowName}`);
    return rows().find((row) => row.element === element);
  };

  const label = (row: ListRow<ListItem>): string =>
    (row.element.querySelector(`.${headlineName}`)?.textContent ?? itemLabel(row.item)).trim().toLowerCase();

  /** Moves focus to the row; the focusin handler moves the roving tab stop. */
  const focusRow = (row: ListRow<ListItem>) => row.element.focus();

  const sync = () => {
    // At rest the selected option holds the stop; with none, the first enabled one.
    const all = enabled();
    const stop = all.find((row) => isSelected(row.id)) ?? all[0];
    for (const row of rows()) {
      row.element.setAttribute("aria-selected", String(isSelected(row.id)));
      row.element.tabIndex = row === stop ? 0 : -1;
    }
  };

  /** A press on an option: focus it, then select it unless disabled, selected or cancelled. */
  const press = (row: ListRow<ListItem>, originalEvent: Event) => {
    if (row.item.disabled) {
      originalEvent.preventDefault();
      return;
    }
    focusRow(row);
    if (isSelected(row.id)) return;
    const payload: SelectEvent<ListItem> = {
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
    if (payload.defaultPrevented) return;
    component.setSelection([row.id]);
    sync();
  };

  /** Moves focus to the next option matching the type-ahead buffer. */
  const typeahead = (all: ListRow<ListItem>[], current: number, key: string) => {
    if (timer !== undefined) clearTimeout(timer);
    buffer += key.toLowerCase();
    timer = setTimeout(() => {
      buffer = "";
      timer = undefined;
    }, 500);
    // One letter — repeated or not — cycles through the options starting with
    // it, from the one after the focused option; a longer prefix searches from
    // the focused option itself.
    const repeated = /^(.)\1*$/.test(buffer);
    const needle = repeated ? buffer[0]! : buffer;
    const from = repeated ? current + 1 : Math.max(current, 0);
    for (let step = 0; step < all.length; step += 1) {
      const candidate = all[(from + step + all.length) % all.length];
      if (label(candidate).startsWith(needle)) {
        focusRow(candidate);
        return;
      }
    }
  };

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    const row = rowOf(event);
    if (!row) return;
    // The enhancer owns every press in a row: the list's own action never sees it.
    event.stopPropagation();
    press(row, event);
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.key === "Tab") return;
    const row = rowOf(event);
    if (!row) return;
    const all = enabled();
    const current = all.indexOf(row);
    const go = (index: number) => {
      event.preventDefault();
      event.stopPropagation();
      focusRow(all[index]);
    };
    const step = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number | undefined>)[
      event.key
    ];
    if (step !== undefined) {
      return go(current < 0 ? (step > 0 ? 0 : all.length - 1) : (current + step + all.length) % all.length);
    }
    if (event.key === "Home") return go(0);
    if (event.key === "End") return go(all.length - 1);
    // A space continues an open type-ahead buffer; on its own it activates.
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

  const onFocusIn = (event: FocusEvent) => {
    focusWithin = true;
    const row = rowOf(event);
    if (!row) return;
    activeId = row.id;
    for (const other of rows()) other.element.tabIndex = other === row ? 0 : -1;
  };

  const onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget;
    if (next instanceof Node && component.element.contains(next)) return;
    focusWithin = false;
    sync();
    // A focused option pulled out by a re-render reports its removal here; the
    // transform that follows puts focus back on the option with the same id.
    if (event.target instanceof Node && !component.element.contains(event.target)) restore = true;
  };

  /** Rewrites each rendered row as an option; the list re-renders whole rows. */
  const transform = () => {
    component.element.setAttribute("role", "listbox");
    for (const row of rows()) {
      const { element, item } = row;
      if ([item.leading, item.trailing].some((slot) => slot && (slot.type === "control" || slot.type === "custom"))) {
        throw new Error(
          "[mtrl:list] options cannot contain secondary controls",
        );
      }
      if (item[indicator]) {
        throw new Error(`[mtrl:list] indicator "${indicator}" collides with the ${indicator} slot`);
      }
      // The row's action button is what named the row; the option takes its name.
      const action = row.action;
      const labelledby = action?.getAttribute("aria-labelledby") ?? element.querySelector<HTMLElement>(`.${headlineName}`)?.id;
      const describedby = action?.getAttribute("aria-describedby");
      const name = action?.getAttribute("aria-label") ?? itemLabel(item);
      element.setAttribute(
        labelledby ? "aria-labelledby" : "aria-label",
        labelledby ?? (name || element.textContent || "Option"),
      );
      if (describedby) element.setAttribute("aria-describedby", describedby);
      element.setAttribute("role", "option");
      if (!element.querySelector(`.${radio}`)) {
        const span = document.createElement("span");
        span.className = radio;
        span.setAttribute("aria-hidden", "true");
        if (indicator === "leading") element.prepend(span);
        else element.append(span);
      }
      action?.remove();
      if (row.action === action) row.action = undefined;
      if (element.querySelector(INTERACTIVE)) {
        throw new Error("[mtrl:list] options cannot contain interactive descendants");
      }
    }
    sync();
    if ((focusWithin || restore) && activeId) rows().find((row) => row.id === activeId)?.element.focus();
    restore = false;
  };

  const api: ListComponent<ListItem> = {
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
      // One option at a time: a radio list keeps the first id a caller passes.
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
    if (timer !== undefined) clearTimeout(timer);
  });
  resources.add(list.onRender(transform));
  transform();
  return api;
};

export default withSingleSelectListbox;

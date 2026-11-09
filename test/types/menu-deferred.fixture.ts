import createDeferredMenu, {
  type DeferredMenuComponent, type DeferredMenuEvent, type DeferredMenuSelectEvent,
} from "../../src/components/menu/deferred";
import type { MenuComponent } from "../../src/components/menu";
const handle = createDeferredMenu({ opener: "#open", items: [], on: {
  open(event) { const menu: DeferredMenuComponent = event.menu; menu.close(); },
  select(event) { const selection: DeferredMenuSelectEvent = event; selection.preventDefault(); },
  loaderror({ error }) { const value: unknown = error; void value; },
} });
const element: HTMLElement | null = handle.element;
const loaded: Promise<void> = handle.preload();
const opened: DeferredMenuComponent = handle.open().close().setItems([]).setSelected(null).setOpener("#next");
handle.on("open", (event: DeferredMenuEvent) => event.menu.close());
handle.on("anything", (_event: unknown) => {});
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export const nullableSurface: Equals<DeferredMenuComponent["element"], HTMLElement | null> = true;
// The broad test-tree project disables strict null checks. The declarations
// project enables them and must reject structural substitution with an eager
// menu. This assertion remains valid in both compiler contexts.
type NullChecksOff = null extends HTMLElement ? true : false;
export const distinctFromEager: DeferredMenuComponent extends MenuComponent ? NullChecksOff : true = true;
void [element, loaded, opened];

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
// @ts-expect-error DOM readiness is deliberately nullable.
const readyElement: HTMLElement = handle.element;
// @ts-expect-error A deferred handle is not a synchronous MenuComponent.
const eager: MenuComponent = handle;
void [element, loaded, opened, readyElement, eager];

import { processClassNames, type BaseComponentConfig } from "../../core/config/component";
import { getCleanup } from "../../core/compose/cleanup";
import { PREFIX } from "../../core/config";
import { createConfig } from "../bottom-app-bar/config";
import type { BottomAppBarConfig, BottomAppBarComponent } from "../bottom-app-bar/types";
import { createToolbarStructure, createToolbarFab } from "./structure";

export type { BottomAppBarConfig as BottomAppBarToolbarConfig, BottomAppBarComponent as BottomAppBarToolbarComponent } from "../bottom-app-bar/types";

/**
 * Self-contained opt-in bottom app bar with docked styling and legacy policy.
 * Import material/styles/bottom-app-bar-toolbar explicitly with this entry.
 * @param config - Legacy bottom app bar options
 * @returns A facade retaining the bottom app bar's chaining and live containers
 * @see https://m3.material.io/components/toolbars/overview
 */
export function createBottomAppBarToolbar(config: BottomAppBarConfig = {}): BottomAppBarComponent {
  // Resolve only this family's defaults; toolbar defaults never participate.
  const settings = createConfig(config);
  const block = `${PREFIX}-bottom-app-bar`;
  const { component, bar } = createToolbarStructure(settings, {
    tag: settings.tag,
    componentName: "bottom-app-bar",
    className: [
      `${PREFIX}-toolbar`, `${PREFIX}-toolbar--docked`, `${PREFIX}-toolbar--bottom`, `${PREFIX}-toolbar--standard`,
      `${block}-toolbar`,
      settings.hasFab ? `${block}--with-fab` : "",
      settings.fabPosition === "center" ? `${block}--fab-center` : "",
      processClassNames((settings as BaseComponentConfig).className || ""),
    ].filter(Boolean),
    attributes: { role: "toolbar", "aria-label": "Bottom app bar" },
    interactive: true,
  }, `${PREFIX}-toolbar__bar ${block}__actions`, {});
  const root = component.element;
  const fab = createToolbarFab(root, `${PREFIX}-toolbar__fab ${block}__fab-container`);
  const resources = getCleanup(component);
  let visible = true;
  let previous = window.scrollY;
  const setVisible = (next: boolean) => {
    root.classList.toggle(`${block}--hidden`, !next);
    const changed = visible !== next;
    visible = next;
    // State is settled before a callback can re-enter the facade.
    if (changed) settings.onVisibilityChange?.(next);
  };
  const api: BottomAppBarComponent = {
    ...component,
    addClass(...classes: string[]) { component.addClass(...classes); return this; },
    addAction(action: HTMLElement) { bar.appendChild(action); return this; },
    addFab(element: HTMLElement) {
      fab.replaceChildren(element);
      root.classList.add(`${block}--with-fab`);
      return this;
    },
    getActionsContainer() { return bar; },
    show() { setVisible(true); return this; },
    hide() { setVisible(false); return this; },
    isVisible() { return visible; },
    destroy() { component.lifecycle.destroy(); },
  };
  if (settings.autoHide) {
    const scroll = () => {
      const current = window.scrollY;
      if (current > previous + 10 && visible) api.hide();
      else if (current < previous - 10 && !visible) api.show();
      previous = current;
    };
    window.addEventListener("scroll", scroll, { passive: true });
    resources.add(() => window.removeEventListener("scroll", scroll));
  }
  if (settings.autoHide && settings.transitionDuration) {
    root.style.transition = `transform ${settings.transitionDuration}ms ease-in-out`;
  }
  return api;
}

export default createBottomAppBarToolbar;

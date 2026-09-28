// src/elements/tabs.ts
/**
 * `<m-tabs>` with `<m-tab>` children.
 *
 * Each `<m-tab>` declares one tab (`value`, `icon`, `badge`, `disabled`, and its
 * text as content). The tabs element reads them into the factory's config and
 * rebuilds when they change; the children stay where the framework put them.
 * `value` on `<m-tabs>` is the initially selected tab; the `value` property is
 * the live selection.
 *
 * @module elements
 */

import createTabs from "../components/tabs";
import type { TabConfig, TabsComponent, TabsConfig } from "../components/tabs/types";
import {
  defineElement, DEFAULT_PREFIX, type Config, type DefineOptions, type ElementAttributes,
  type ElementInstance, type ElementSpec,
} from "./define";

const readTabs = (host: HTMLElement): Config => {
  const tabTag = host.localName.replace(/tabs$/, "tab");
  const active = host.getAttribute("value");
  const tabs: TabConfig[] = [];
  for (const child of Array.from(host.children)) {
    if (child.localName !== tabTag) continue;
    const text = child.getAttribute("label") ?? (child.textContent ?? "").trim();
    const value = child.getAttribute("value") ?? text;
    const badge = child.getAttribute("badge");
    tabs.push({
      text,
      value,
      icon: child.getAttribute("icon") ?? undefined,
      badge: badge ?? undefined,
      disabled: child.hasAttribute("disabled"),
      state: value === active ? "active" : undefined,
    });
  }
  return { tabs } satisfies TabsConfig;
};

const tabsSpec = {
  name: "tabs",
  create: (config) => createTabs(config as TabsConfig),
  styles: ["badge", "progress", "button", "tabs"],
  hostStyles: ":host{display:block}",
  attributes: {
    variant: { type: "string", config: "variant" },
    value: { type: "string" },
  },
  properties: {
    value: {
      get: (c) => c.getActiveTab()?.getValue() ?? null,
      set: (c, v) => void (v === null || v === undefined ? undefined : c.setActiveTab(String(v))),
    },
  },
  model: "value" as const,
  events: {
    change: {
      detail: (payload) => ({ value: (payload as { value: string | null }).value }),
    },
  },
  config: readTabs,
  observeChildren: true,
} satisfies ElementSpec<TabsComponent>;

export const tabsElement = defineElement<TabsComponent>(tabsSpec);
export type TabsSpec = typeof tabsSpec;
/** `<m-tabs>` as a ref or a query returns it. */
export type TabsElement = ElementInstance<TabsSpec, TabsComponent>;

/**
 * `<m-tab>` declares one tab and renders nothing. Its text content is the
 * label unless `label` is set.
 */
export const tabDeclaration = {
  name: "tab",
  attributes: {
    value: { type: "string" },
    label: { type: "string" },
    icon: { type: "string" },
    badge: { type: "string" },
    disabled: { type: "boolean" },
  },
} as const;
export type TabAttributes = ElementAttributes<typeof tabDeclaration>;

/** Registers `<m-tabs>` and `<m-tab>` (or with another prefix). */
export const defineTabs = (options?: DefineOptions): string => {
  const tag = tabsElement.define(options);
  const tabTag = `${options?.prefix ?? DEFAULT_PREFIX}-${tabDeclaration.name}`;
  // A tab only declares data; it renders nothing and has no behaviour.
  if (!customElements.get(tabTag)) customElements.define(tabTag, class extends HTMLElement {});
  return tag;
};

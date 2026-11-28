// test/core/compose/features/icon.test.ts
//
// withIcon's start-position placement looks the component's label up by a
// class name built from the configured componentName. A componentName is
// data, not selector syntax: one containing a quote or a backslash made the
// interpolated `[class*=...]` selector throw, so the icon never landed at
// all. The lookup compares the literal class token instead, which no name
// can break and which still reaches names carrying a dot or a colon.
import { describe, test, expect, beforeEach } from "bun:test";
import { withIcon } from "../../../../src/core/compose/features/icon";
import type { ElementComponent } from "../../../../src/core/compose/component";
import { PREFIX } from "../../../../src/core/config";
import "../../../setup"; // Import the jsdom setup

const componentWithLabel = (name: string): { element: HTMLElement; label: HTMLElement } => {
  const element = document.createElement("div");
  const label = document.createElement("span");
  label.className = `${PREFIX}-${name}__label`;
  element.appendChild(label);
  return { element, label };
};

describe("withIcon", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  test("sets the icon after the label for a plain componentName", () => {
    const { element, label } = componentWithLabel("card");
    const enhanced = withIcon({ componentName: "card" })({ element } as ElementComponent);
    enhanced.icon.setIcon("<i>♥</i>");
    expect(element.firstElementChild).toBe(label);
    expect(label.nextElementSibling?.classList.contains(`${PREFIX}-icon`)).toBe(true);
  });

  // Each of these names is a valid thing to call a component. A quote or a
  // backslash broke the interpolated selector outright; a dot and a colon
  // ride on substring matching and must keep resolving under token matching.
  for (const name of ['a"b', "a\\b", "a.b", "a:b"]) {
    test(`sets the icon after the label for componentName ${JSON.stringify(name)}`, () => {
      const { element, label } = componentWithLabel(name);
      const enhanced = withIcon({ componentName: name })({ element } as ElementComponent);
      enhanced.icon.setIcon("<i>♥</i>");
      expect(element.firstElementChild).toBe(label);
      expect(label.nextElementSibling?.classList.contains(`${PREFIX}-icon`)).toBe(true);
    });
  }

  test("sets the icon as the first child when there is no label", () => {
    const element: HTMLElement = document.createElement("div");
    element.appendChild(document.createElement("b"));
    const enhanced = withIcon({ componentName: "card" })({ element } as ElementComponent);
    enhanced.icon.setIcon("<i>♥</i>");
    expect(element.firstElementChild?.classList.contains(`${PREFIX}-icon`)).toBe(true);
  });

  test("removeIcon takes the element out, and the next setIcon builds it again as configured", () => {
    const element: HTMLElement = document.createElement("div");
    const other = element.appendChild(document.createElement("b"));
    const enhanced = withIcon({ componentName: "card", iconPosition: "end", iconSize: "lg", icon: "<i>a</i>" })(
      { element } as ElementComponent,
    );
    const classes = (): string[] => [...(enhanced.icon.getElement()?.classList ?? [])].sort();
    const configured = [`${PREFIX}-card__icon`, `${PREFIX}-card__icon--end`, `${PREFIX}-icon`, `${PREFIX}-icon--lg`];
    expect(classes()).toEqual(configured);
    const first = enhanced.icon.getElement();

    expect(enhanced.icon.removeIcon()).toBe(enhanced.icon);
    expect(first?.isConnected).toBe(false);
    expect(first?.parentNode).toBeNull();
    expect(enhanced.icon.getElement()).toBeNull();
    expect(enhanced.icon.getIcon()).toBe("");
    expect([...element.children]).toEqual([other]);
    // Removing what is not there is nothing.
    enhanced.icon.removeIcon();
    expect([...element.children]).toEqual([other]);

    enhanced.icon.setIcon("<i>b</i>");
    expect(enhanced.icon.getElement()).not.toBe(first);
    expect(classes()).toEqual(configured);
    expect(enhanced.icon.getIcon()).toBe("<i>b</i>");
    // The end position: after what the element already holds.
    expect(element.lastElementChild).toBe(enhanced.icon.getElement());
  });

  test("an empty setIcon still changes nothing: removal is removeIcon's", () => {
    const element: HTMLElement = document.createElement("div");
    const enhanced = withIcon({ componentName: "card", icon: "<i>a</i>" })({ element } as ElementComponent);
    enhanced.icon.setIcon("");
    expect(enhanced.icon.getIcon()).toBe("<i>a</i>");
    expect(enhanced.icon.getElement()?.parentNode).toBe(element);
  });
});

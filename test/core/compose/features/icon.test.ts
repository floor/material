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
    const enhanced = withIcon({ componentName: "card" })({ element } as never);
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
      const enhanced = withIcon({ componentName: name })({ element } as never);
      enhanced.icon.setIcon("<i>♥</i>");
      expect(element.firstElementChild).toBe(label);
      expect(label.nextElementSibling?.classList.contains(`${PREFIX}-icon`)).toBe(true);
    });
  }

  test("sets the icon as the first child when there is no label", () => {
    const element = document.createElement("div");
    element.appendChild(document.createElement("b"));
    const enhanced = withIcon({ componentName: "card" })({ element } as never);
    enhanced.icon.setIcon("<i>♥</i>");
    expect(element.firstElementChild?.classList.contains(`${PREFIX}-icon`)).toBe(true);
  });
});

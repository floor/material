import { setHTML } from "../../../../core/dom/html";
import type { ChipMount } from "../variant";

const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

/** Input chips select, take an avatar, and are always removable (m3.material.io chips). */
export const inputMount: ChipMount = parts => {
  const { options } = parts;
  const label = () => options.removeLabel ?? `Remove ${parts.label.textContent ?? ""}`;
  // Every input chip is removable (m3.material.io chips); it used to need onRemove.
  const button = document.createElement("button");
  button.type = "button";
  button.className = parts.classOf("chip__remove");
  setHTML(button, parts.getTrailingIcon() || CLOSE);
  parts.root.append(button);
  parts.root.setAttribute("role", "group");
  // Backspace and Delete remove a focused removable chip (m3.material.io chips
  // accessibility, keyboard table).
  const removeFromKeyboard = (event: KeyboardEvent) => {
    if (parts.isDisabled() || (event.key !== "Backspace" && event.key !== "Delete")) return false;
    event.preventDefault();
    button.click();
    return true;
  };
  parts.listen(button, "click", event => {
    event.stopPropagation();
    if (parts.isDisabled()) return;
    const chip = parts.getApi();
    parts.emit("remove", chip);
    // After the listeners, which read a chip that is still there: in a set the
    // set removes it, on its own the chip leaves the page.
    if (parts.isDestroyed()) return;
    if (options.onRemoved) options.onRemoved(chip);
    else parts.root.remove();
  });
  // Enter and Space activate this button, so the set must not also select the chip
  // for them; the arrows go on to the set's navigation, which they did not.
  parts.listen(button, "keydown", event => {
    if (removeFromKeyboard(event)) return;
    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  });
  return {
    remove: button,
    keydown: removeFromKeyboard,
    setTrailingGlyph: icon => setHTML(button, icon || CLOSE),
    render: () => {
      button.disabled = parts.isDisabled();
      button.setAttribute("aria-label", label());
      if (!parts.options.cell) parts.root.setAttribute("aria-label", parts.label.textContent ?? "");
    },
  };
};

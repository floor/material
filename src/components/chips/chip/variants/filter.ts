import { setHTML } from "../../../../core/dom/html";
import type { ChipMount } from "../variant";

const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const DROP_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>';

/** Filter chips select and show a checkmark, and may give their trailing icon its own action (m3.material.io chips). */
export const filterMount: ChipMount = parts => {
  const { options } = parts;
  if (!options.onTrailingClick) return undefined;
  const glyph = (icon: string) => icon || (options.trailingMenu ? DROP_DOWN : CLOSE);
  const label = () => options.trailingLabel ?? (options.trailingMenu
    ? `${parts.label.textContent ?? ""} options`
    : `Remove ${parts.label.textContent ?? ""}`);
  const button = document.createElement("button");
  button.type = "button";
  button.className = parts.classOf("chip__trailing-action");
  setHTML(button, glyph(parts.getTrailingIcon()));
  parts.root.append(button);
  parts.root.setAttribute("role", "group");
  if (options.trailingMenu) {
    button.setAttribute("aria-haspopup", "menu");
    button.setAttribute("aria-expanded", "false");
  }
  parts.listen(button, "click", event => {
    event.stopPropagation();
    if (parts.isDisabled()) return;
    parts.emit("trailing", parts.getApi());
  });
  // Enter and Space activate this button, so the set must not also select the
  // chip for them; the arrows go on to the set's navigation.
  parts.listen(button, "keydown", event => {
    if (event.key === "Enter" || event.key === " ") event.stopPropagation();
  });
  return {
    trailingAction: button,
    setTrailingGlyph: icon => setHTML(button, glyph(icon)),
    render: () => {
      button.disabled = parts.isDisabled();
      button.setAttribute("aria-label", label());
      if (!parts.options.cell) parts.root.setAttribute("aria-label", parts.label.textContent ?? "");
    },
  };
};

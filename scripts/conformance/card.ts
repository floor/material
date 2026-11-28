import assert from "node:assert/strict";
import { CONFORMANCE_PROPERTIES, createConformanceHarness, fixtureEngine, selectFixtureCases, type Case, type Part } from "./measure";
import type { CardComponent, CardConfig } from "../../src/components/card/types";

type CardCase = { variant: CardConfig["variant"]; dragged?: boolean; disabled?: boolean };

const mount: Case["mount"] = (mtrl, host, data) => {
  const { variant, dragged, disabled } = data as CardCase;
  const create = mtrl.createCard as unknown as (config: CardConfig) => CardComponent;
  const card = create({
    variant,
    clickable: !disabled,
    draggable: !!dragged,
    class: disabled ? "mtrl-card--state-disabled" : undefined,
  });
  const content = document.createElement("div");
  content.className = "mtrl-card__content";
  content.textContent = "Card content";
  card.addContent(content);
  host.append(card.element);
  if (!card.element.classList.contains(`mtrl-card--${variant}`)) throw new Error(`Wrong card variant: ${variant}`);
  if (dragged && card.element.getAttribute("draggable") !== "true") throw new Error("Card is not draggable");
};

const parts: Part[] = [
  { name: "card", selector: ".mtrl-card" },
  { name: "content", selector: ".mtrl-card__content" },
  { name: "layer", selector: ".mtrl-card", pseudo: "::before" },
  { name: "after", selector: ".mtrl-card", pseudo: "::after" },
  { name: "wave", selector: ".mtrl-ripple-wave" },
];

const states = ["rest", "hover", "focus", "pressed", "disabled", "dragged"] as const;
const variants = ["elevated", "filled", "outlined"] as const;
const cases: Case[] = variants.flatMap(variant =>
  (["light", "dark"] as const).flatMap(scheme => states.map(state => ({
    id: `${variant}/${scheme}/${state}`,
    mount, scheme, settleTransitions: true, properties: [...CONFORMANCE_PROPERTIES, "textAlign"],
    state,
    config: { variant, dragged: state === "dragged", disabled: state === "disabled" },
    parts: [...parts, ...(state === "hover" || state === "pressed" || state === "focus"
      ? [{ name: "activeState", selector: `.mtrl-card:${state === "pressed" ? "active" : state === "focus" ? "focus-visible" : "hover"}` }]
      : [])],
  }))),
);

const engine = fixtureEngine();
const harness = await createConformanceHarness({ component: "card", engine });
try {
  const rows = await harness.measure(selectFixtureCases(cases));
  for (const row of rows) {
    assert.ok(row.parts.card && row.parts.content, row.id);
    if (["hover", "pressed", "focus"].includes(row.state)) assert.ok(row.parts.activeState, row.id);
  }
  console.log(JSON.stringify({ source: harness.source, engine, rows }, null, 2));
} finally {
  await harness.close();
}

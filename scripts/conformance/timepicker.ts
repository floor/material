import type { TimePickerComponent, TimePickerConfig } from "../../src/components/timepicker/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  type: "dial" | "input";
  format: "12h" | "24h";
  orientation: "vertical" | "horizontal";
  direction: "ltr" | "rtl";
  seconds?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const { direction, seconds, ...config } = data as Config;
  const page = window as Window & { measuredTimepicker?: TimePickerComponent };
  page.measuredTimepicker?.destroy();
  document.documentElement.dir = direction;
  const create = mtrl.createTimePicker as unknown as (settings: TimePickerConfig) => TimePickerComponent;
  const picker = create({ ...config, title: "Select time", value: "14:30", showSeconds: seconds });
  host.append(picker.element);
  page.measuredTimepicker = picker;
  picker.open();
};

const dialog = ".mtrl-time-picker__dialog[open]";
const piece = (suffix: string) => `${dialog} .mtrl-time-picker__${suffix}`;
const period = piece("period");
const selectedPeriod = `${period} [aria-checked='true']`;
const restPeriod = `${period} [aria-checked='false']`;
const parts = [
  part("surface", dialog), part("scrim", dialog, "::backdrop"), part("title", piece("title")),
  part("hours", piece("hours")), part("mins", piece("minutes")), part("secs", piece("seconds")),
  part("inputLabel", piece("input-label")), part("separator", piece("separator")),
  part("period", period), part("selectedPeriod", selectedPeriod), part("restPeriod", restPeriod),
  part("dial", piece("dial-face")), part("center", piece("dial-centre")),
  part("handle", piece("dial-handle")), part("track", piece("dial-track")),
  part("dialSelected", piece("dial-numbers--selected .mtrl-time-picker__dial-number:nth-child(2)")),
  part("dialRest", piece("dial-numbers:not(.mtrl-time-picker__dial-numbers--selected) .mtrl-time-picker__dial-number:nth-child(3)")),
  part("toggle", piece("toggle-type")), part("toggleIcon", piece("toggle-type svg")),
  part("confirm", piece("confirm")), part("cancel", piece("cancel")),
];
const properties = [...fieldProperties, "borderInlineEndWidth", "borderInlineEndColor", "animationDuration", "rotate"];
const cases: Case[] = [];

for (const type of ["dial", "input"] as const) {
  const setup: Config = { type, format: "12h", orientation: "vertical", direction: "ltr" };
  const add = (
    id: string, config: Config, scheme: "light" | "dark" = "light", density = 0,
    state: ReadState = "rest", target = piece("hours"),
  ) => {
    const check = interaction("verifiedState", target, state);
    cases.push({
      id: `${type}/${id}`, config, mount, scheme, density, properties, state, before: 180,
      focusTarget: state === "focus" ? target : undefined,
      parts: [part("stateTarget", target), ...parts, ...check],
    });
  };
  for (const scheme of ["light", "dark"] as const) {
    add(`base/${scheme}`, setup, scheme);
    add(`horizontal/${scheme}`, { ...setup, orientation: "horizontal" }, scheme);
    add(`24h/${scheme}`, { ...setup, format: "24h" }, scheme);
    for (const state of ["hover", "focus", "pressed"] as const) {
      add(`hours/${state}/${scheme}`, setup, scheme, 0, state);
      add(`period-selected/${state}/${scheme}`, setup, scheme, 0, state, selectedPeriod);
      if (state !== "focus") add(`period-unselected/${state}/${scheme}`, setup, scheme, 0, state, restPeriod);
      if (state === "hover" || (type === "dial" && state === "pressed")) {
        add(`minutes/${state}/${scheme}`, setup, scheme, 0, state, piece("minutes"));
      }
    }
  }
  for (const density of [-1, -2, -3]) add(`density/${density}`, setup, "light", density);
  add("rtl", { ...setup, direction: "rtl" });
  add("seconds", { ...setup, seconds: true, format: "24h" });
}

await runFieldFixture("timepicker", cases, id => [
  "surface", "title", "hours", "mins", "separator", "confirm", "cancel", "toggle",
  ...(id.includes("/24h/") || id.endsWith("/seconds") ? [] : ["period", "selectedPeriod", "restPeriod"]),
  ...(id.startsWith("dial/") ? ["dial", "handle", "center", "track", "dialRest"] : ["inputLabel"]),
]);

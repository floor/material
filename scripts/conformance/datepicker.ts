import type { DatePickerComponent, DatePickerConfig } from "../../src/components/datepicker/types";
import type { Case } from "./measure";
import { fieldProperties, interaction, part, runFieldFixture, type ReadState } from "./field-fixture";

type Config = {
  variant: "docked" | "modal" | "modal-input" | "fullscreen";
  mode: "single" | "range";
  view: "day" | "month" | "year";
  direction: "ltr" | "rtl";
  animate?: boolean;
};

const mount: Case["mount"] = (mtrl, host, data) => {
  const config = data as Config;
  const page = window as Window & { measuredDatepicker?: DatePickerComponent };
  page.measuredDatepicker?.destroy();
  document.documentElement.dir = config.direction;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 12);
  const end = new Date(year, month, 18);
  const create = mtrl.createDatePicker as unknown as (settings: DatePickerConfig) => DatePickerComponent;
  const picker = create({
    variant: config.variant,
    selectionMode: config.mode,
    initialView: config.view,
    value: config.mode === "range" ? [start, end] : start,
    minDate: new Date(year - 1, 1, 1),
    maxDate: new Date(year, month, 27),
    locale: "en-US",
    label: "Select date",
    animate: config.animate ?? false,
  });
  host.append(picker.element);
  page.measuredDatepicker = picker;
  picker.open();
};

const calendar = ".mtrl-datepicker__calendar[open]";
const within = (suffix: string) => `${calendar} .mtrl-datepicker__${suffix}`;
const grid = within("days:not([inert])");
const unselected = `${grid} [data-date]:not([disabled],[aria-current],.mtrl-datepicker__day--selected,.mtrl-datepicker__day--outside)`;
const day = `${grid} [data-date]`;
const rangeMiddle = `${grid} .mtrl-datepicker__cell--range:not(.mtrl-datepicker__cell--range-start,.mtrl-datepicker__cell--range-end)`;
const parts = [
  part("surface", calendar), part("scrim", calendar, "::backdrop"),
  part("externalInput", ".mtrl-datepicker__input:not([data-entry])"),
  part("header", within("modal-header")), part("headline", within("headline")), part("support", within("title")),
  part("navigation", within("header")), part("yearList", within("years")), part("monthList", within("months")),
  part("track", within("track")), part("prevIcon", within("prev svg")), part("nextIcon", within("next svg")),
  part("toggle", within("mode-toggle")), part("toggleIcon", within("mode-toggle svg")),
  part("previous", within("prev")), part("next", within("next")), part("week", within("weekdays")),
  part("weekday", within("weekday")), part("grid", grid), part("day", unselected),
  part("dayLayer", unselected, "::after"), part("selected", `${day}.mtrl-datepicker__day--selected`),
  part("selectedInk", `${day}.mtrl-datepicker__day--selected`, "::before"),
  part("today", `${day}[aria-current='date']`), part("todayInk", `${day}[aria-current='date']`, "::before"),
  part("outside", `${day}.mtrl-datepicker__day--outside`), part("dayFocusLayer", `${day}:focus-visible`, "::after"),
  part("disabled", `${day}[disabled]`), part("rangeContinuation", `${rangeMiddle}:last-child`, "::before"),
  part("rangeCell", rangeMiddle), part("rangeLabel", `${rangeMiddle} button`),
  part("rangeStart", `${grid} .mtrl-datepicker__cell--range-start`, "::before"),
  part("year", within("year[aria-pressed='false']")), part("yearLayer", within("year[aria-pressed='false']"), "::before"),
  part("selectedYear", within("year[aria-pressed='true']")), part("selectedYearInk", within("year[aria-pressed='true']"), "::before"),
  part("selectedMonth", within("month[aria-pressed='true']")),
  part("dateInput", `${calendar} input[data-entry='start']`), part("endInput", `${calendar} input[data-entry='end']`),
  part("fieldLabel", within("fields label")), part("fieldHelp", within("fields .mtrl-datepicker__help")),
  part("confirm", within("confirm")), part("cancel", within("cancel")), part("close", within("close")),
  part("save", within("save")), part("subhead", within("subhead")), part("list", within("list")),
];

const properties = [...fieldProperties, "borderBottomWidth", "animationDuration", "overflowX", "boxSizing",
  "backgroundImage", "backgroundSize", "backgroundPosition", "scrollSnapType",
];
const cases: Case[] = [];
for (const [variant, modes, views] of [
  ["docked", ["single", "range"], ["day", "month", "year"]],
  ["modal", ["single", "range"], ["day", "year"]],
  ["modal-input", ["single", "range"], ["day"]],
  ["fullscreen", ["single", "range"], ["day"]],
] as const) {
  const add = (
    id: string, mode: Config["mode"], view: Config["view"],
    scheme: "light" | "dark" = "light", direction: Config["direction"] = "ltr", density = 0,
    state: ReadState = "rest",
  ) => {
    const target = state === "focus" ? `${grid} [data-date][tabindex='0']` : unselected;
    const markers = state === "rest" ? [] : interaction("verifiedState", target, state);
    cases.push({
      id: `${variant}/${id}`, config: { variant, mode, view, direction }, mount,
      parts: [part("stateTarget", target), ...parts, ...markers], scheme, density, properties,
      state: state === "focus" ? "rest" : state, keys: state === "focus" ? ["ArrowDown"] : undefined, before: 280,
    });
  };
  for (const mode of modes) {
    for (const view of views) {
      for (const scheme of ["light", "dark"] as const) add(`${mode}/${view}/${scheme}`, mode, view, scheme);
    }
  }
  add("range/rtl", "range", "day", "light", "rtl");
  for (const density of [-1, -2, -3]) add(`density/${density}`, "single", "day", "light", "ltr", density);
  if (variant === "docked" || variant === "modal") {
    for (const state of ["hover", "focus", "pressed"] as const) add(state, "single", "day", "light", "ltr", 0, state);
  }
}
cases.push({
  id: "modal/animated",
  mount,
  config: { variant: "modal", mode: "single", view: "day", direction: "ltr", animate: true } satisfies Config,
  parts,
  properties,
  before: 280,
});

await runFieldFixture("datepicker", cases, id => {
  const needed = ["surface", "externalInput"];
  if (id.startsWith("modal-input")) return [...needed, "header", "dateInput", "fieldLabel", "confirm", "cancel"];
  if (id.includes("/year/")) return [...needed, "year", "selectedYear", "selectedYearInk"];
  if (id.includes("/month/")) return [...needed, "selectedMonth"];
  if (id.startsWith("fullscreen")) return [...needed, "header", "close", "save", "list", "subhead"];
  return [...needed, "weekday", "selected", "selectedInk", "day", "previous", "next"];
});

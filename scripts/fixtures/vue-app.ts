// The app scripts/check-vue.ts renders on the server and hydrates in the
// browser. Render functions, so no template compiler is needed. Built against
// dist/vue.
import { defineComponent, h, ref, onMounted, type Ref } from "vue";
import {
  MButton, MCheckbox, MList, MListItem, MNavigationRail, MNavigationRailItem, MProgress, MRadio, MRadios, MSlider, MSwitch,
  MTab, MTabs, MTextField, type Exposed,
} from "../../dist/vue/index.js";
import type { SwitchElement } from "../../dist/elements/index.js";
import { MChip, MChips } from "../../dist/vue/index.js";
import { MSelect, MSelectOption } from "../../dist/vue/index.js";
import { MDialog } from "../../dist/vue/index.js";
import { MDatepicker } from "../../dist/vue/index.js";
import { MSearch, MSearchSuggestion } from "../../dist/vue/index.js";

const ICON = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
// The suggestions a search offers, filtered by the query as the user types.
const FRUITS = ["Apple", "Apricot", "Banana"];

type Log = Array<{ id: string; detail: unknown }>;
export interface Api {
  log: Log;
  modelLog: Array<{ id: string; detail: unknown; host: unknown }>;
  submits: number;
  model: Ref<boolean>;
  extra: Ref<boolean>;
  order: Ref<string[]>;
  show: Ref<boolean>;
  progress: Ref<number>;
  setDialog: (v: boolean) => void;
  setRail: (v: boolean) => void;
  switchRef: Ref<Exposed<SwitchElement> | null>;
}

export const App = defineComponent(() => {
  const model = ref(false);
  const named = ref(false);
  const agreed = ref(false);
  const level = ref(50);
  const text = ref("");
  const size = ref<string | null>("m");
  const diet = ref<string | string[] | null>(["veg"]);
  const tab = ref<string | null>("t2");
  const destination = ref<string | null>("inbox");
  const extra = ref(false);
  const order = ref(["a", "b"]);
  const show = ref(true);
  const progress = ref(30);
  const fruit = ref<string | null>("b");
  const pet = ref<string | null>("cat");
  const dialog = ref(false);
  const rail = ref(false);
  const due = ref("2026-09-10");
  const query = ref("ap");
  const switchRef = ref<Exposed<SwitchElement> | null>(null);
  const api: Api = {
    log: [], modelLog: [], submits: 0, model, extra, order, show, progress, switchRef,
    setDialog: (v: boolean) => void (dialog.value = v),
    setRail: (v: boolean) => void (rail.value = v),
  };
  onMounted(() => {
    (window as unknown as { api: Api }).api = api;
  });
  const log = (id: string) => (event: CustomEvent<unknown>): void => {
    api.log.push({ id, detail: event.detail });
  };
  const recordModel = (id: string, event: CustomEvent<{ value: unknown }>, field: "value" | "checked" = "value"): void => {
    const host = event.target as HTMLElement & { value: unknown; checked: boolean };
    api.modelLog.push({ id, detail: structuredClone(event.detail.value), host: structuredClone(host[field]) });
  };

  return () =>
    h("main", null, [
      h(
        "form",
        {
          id: "f",
          onSubmit: (e: Event) => {
            e.preventDefault();
            api.submits++;
          },
        },
        [
          h(MSwitch, { id: "u", name: "u", defaultChecked: true, onChange: (e: CustomEvent<{ value: boolean }>) => { log("u")(e); recordModel("boolean", e, "checked"); }, ref: switchRef }, () => "Uncontrolled"),
          h(MSwitch, { id: "m", modelValue: model.value, "onUpdate:modelValue": (v: boolean) => (model.value = v) }, () => "Model"),
          h(MSwitch, { id: "n", checked: named.value, "onUpdate:checked": (v: boolean) => (named.value = v) }, () => "Named"),
          h(MSwitch, { id: "d", disabled: true, supportingText: "Unavailable" }, () => "Disabled"),
          h(MButton, { id: "b", type: "submit", variant: "filled", class: "save", "data-test": "1" }, () => "Save"),
        ]
      ),
      h(MTabs, { id: "t", modelValue: tab.value, "onUpdate:modelValue": (v: string) => (tab.value = v) }, () => [
        h(MTab, { value: "t1" }, () => "Flights"),
        h(MTab, { value: "t2" }, () => "Trips"),
        extra.value ? h(MTab, { value: "t3" }, () => "Hotels") : null,
      ]),
      h("output", { id: "tab" }, String(tab.value)),
      h("output", { id: "model" }, String(model.value)),
      h("output", { id: "named" }, String(named.value)),
      h(MProgress, { id: "pg", value: progress.value, ariaLabel: "Uploading" }),
      h(MCheckbox, { id: "cb", modelValue: agreed.value, "onUpdate:modelValue": (v: boolean) => (agreed.value = v) }, () => "Agree"),
      h("output", { id: "agreed" }, String(agreed.value)),
      h(MSlider, { id: "sl", ariaLabel: "Level", modelValue: level.value, "onUpdate:modelValue": (v: number) => (level.value = v) }),
      h("output", { id: "level" }, String(level.value)),
      h(MTextField, { id: "tf", label: "Name", modelValue: text.value, onInput: (e: CustomEvent<{ value: string }>) => recordModel("string", e), "onUpdate:modelValue": (v: string) => (text.value = v) }),
      h("output", { id: "text" }, text.value),
      h(MRadios, { id: "rd", ariaLabel: "Size", modelValue: size.value, "onUpdate:modelValue": (v: string) => (size.value = v) }, () => [
        h(MRadio, { value: "s" }, () => "Small"),
        h(MRadio, { value: "m" }, () => "Medium"),
        h(MRadio, { value: "l" }, () => "Large"),
      ]),
      h("output", { id: "size" }, String(size.value)),
      h(
        MNavigationRail,
        { id: "nr", ariaLabel: "Main", modelValue: destination.value, "onUpdate:modelValue": (v: string) => (destination.value = v) },
        () => [
          h(MNavigationRailItem, { value: "inbox", icon: ICON }, () => "Inbox"),
          h(MNavigationRailItem, { value: "sent", icon: ICON }, () => "Sent"),
          h(MNavigationRailItem, { value: "starred", icon: ICON }, () => "Starred"),
        ]
      ),
      h("output", { id: "destination" }, String(destination.value)),
      h(MChips, { id: "ck", ariaLabel: "Diet", modelValue: diet.value, onChange: (e: CustomEvent<{ value: string | string[] | null }>) => recordModel("array", e), "onUpdate:modelValue": (v: string | string[]) => (diet.value = v) }, () => [
        h(MChip, { value: "veg" }, () => "Vegetarian"),
        h(MChip, { value: "gf" }, () => "Gluten free"),
      ]),
      h("output", { id: "diet" }, String(diet.value)),
      h(MList, { id: "li", ariaLabel: "Fruits", modelValue: fruit.value, "onUpdate:modelValue": (v: string) => (fruit.value = v) }, () => [
        h(MListItem, { value: "a" }, () => "Apple"),
        h(MListItem, { value: "b" }, () => "Banana"),
        h(MListItem, { value: "c" }, () => "Cherry"),
      ]),
      h("output", { id: "fruit" }, String(fruit.value)),
      h(MSelect, { id: "se", label: "Pet", modelValue: pet.value, "onUpdate:modelValue": (v: string) => (pet.value = v) }, () => [
        h(MSelectOption, { value: "cat" }, () => "Cat"),
        h(MSelectOption, { value: "dog" }, () => "Dog"),
      ]),
      h("output", { id: "pet" }, String(pet.value)),
      // Controlled: Escape closes the dialog, and onClose puts the state in step
      // Named slots (FLO-325): a text headline, a component in actions
      h(MDialog, { id: "dg", open: dialog.value, onClose: () => (dialog.value = false) }, {
        default: () => "Your changes will be lost.",
        headline: () => "Discard draft?",
        actions: () => [h(MButton, { id: "dga" }, () => "Discard")],
      }),
      h("output", { id: "dialog" }, String(dialog.value)),
      // Controlled: expanded is state; Escape collapses the modal rail, and
      // onCollapse puts the state in step
      h(
        MNavigationRail,
        {
          id: "mr", layout: "modal", ariaLabel: "Modal rail", expanded: rail.value,
          onExpand: () => (rail.value = true), onCollapse: () => (rail.value = false),
        },
        () => [
          h(MNavigationRailItem, { value: "inbox", icon: ICON }, () => "Inbox"),
          h(MNavigationRailItem, { value: "sent", icon: ICON }, () => "Sent"),
        ]
      ),
      h("output", { id: "rail" }, String(rail.value)),
      h(MDatepicker, { id: "dt", variant: "modal", label: "Due", modelValue: due.value, "onUpdate:modelValue": (v: string) => (due.value = v) }),
      h("output", { id: "due" }, due.value),
      // v-model, its suggestions replaced as the query changes
      h(MSearch, { id: "sq", ariaLabel: "Query", modelValue: query.value, "onUpdate:modelValue": (v: string) => (query.value = v) }, () =>
        FRUITS.filter((f) => f.toLowerCase().includes(query.value.toLowerCase())).map((f) =>
          h(MSearchSuggestion, { key: f, value: f.toLowerCase() }, () => f)
        )
      ),
      h("output", { id: "query" }, query.value),
      ...order.value.map((key) => h(MSwitch, { key, id: `o${key}` }, () => `Order ${key}`)),
      show.value ? h(MSwitch, { id: "gone" }, () => "Gone") : null,
      // Mounted in the browser after the element is defined: Vue writes a key
      // the element has as a property.
      extra.value ? h(MSwitch, { id: "late", defaultChecked: true, disabled: true }, () => "Late") : null,
    ]);
});

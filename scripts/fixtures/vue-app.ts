// The app scripts/check-vue.ts renders on the server and hydrates in the
// browser. Render functions, so no template compiler is needed. Built against
// dist/vue.
import { defineComponent, h, ref, onMounted, type Ref } from "vue";
import { MButton, MCheckbox, MProgress, MSlider, MSwitch, MTab, MTabs, MTextfield, type Exposed } from "../../dist/vue/index.js";
import type { SwitchElement } from "../../dist/elements/index.js";

type Log = Array<{ id: string; detail: unknown }>;
export interface Api {
  log: Log;
  submits: number;
  model: Ref<boolean>;
  extra: Ref<boolean>;
  order: Ref<string[]>;
  show: Ref<boolean>;
  progress: Ref<number>;
  switchRef: Ref<Exposed<SwitchElement> | null>;
}

export const App = defineComponent(() => {
  const model = ref(false);
  const named = ref(false);
  const agreed = ref(false);
  const level = ref(50);
  const text = ref("");
  const tab = ref<string | null>("t2");
  const extra = ref(false);
  const order = ref(["a", "b"]);
  const show = ref(true);
  const progress = ref(30);
  const switchRef = ref<Exposed<SwitchElement> | null>(null);
  const api: Api = { log: [], submits: 0, model, extra, order, show, progress, switchRef };
  onMounted(() => {
    (window as unknown as { api: Api }).api = api;
  });
  const log = (id: string) => (event: CustomEvent<unknown>): void => {
    api.log.push({ id, detail: event.detail });
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
          h(MSwitch, { id: "u", name: "u", defaultChecked: true, onChange: log("u"), ref: switchRef }, () => "Uncontrolled"),
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
      h(MTextfield, { id: "tf", label: "Name", modelValue: text.value, "onUpdate:modelValue": (v: string) => (text.value = v) }),
      h("output", { id: "text" }, text.value),
      ...order.value.map((key) => h(MSwitch, { key, id: `o${key}` }, () => `Order ${key}`)),
      show.value ? h(MSwitch, { id: "gone" }, () => "Gone") : null,
      // Mounted in the browser after the element is defined: Vue writes a key
      // the element has as a property.
      extra.value ? h(MSwitch, { id: "late", defaultChecked: true, disabled: true }, () => "Late") : null,
    ]);
});

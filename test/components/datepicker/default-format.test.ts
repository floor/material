// test/components/datepicker/default-format.test.ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import createDatePicker from "../../../src/components/datepicker";
import createDeferredDatePicker from "../../../src/components/datepicker/deferred";
import { clearGlobalDefaults, setComponentDefaults } from "../../../src/core/config/global";
import type { DatePickerComponent } from "../../../src/components/datepicker/types";
let dom: JSDOM;
let instances: DatePickerComponent[];
beforeEach(() => {
  dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost/", pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, Node: dom.window.Node,
    Event: dom.window.Event, MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent,
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window) });
  clearGlobalDefaults(); instances = [];
});
afterEach(() => { for (const picker of instances) picker.destroy(); clearGlobalDefaults(); dom.window.close(); });
for (const [entry, create] of [["eager", createDatePicker], ["deferred", createDeferredDatePicker]] as const) {
  describe(`${entry} date picker format defaults`, () => {
    const mount = (config: Parameters<typeof create>[0]) => { const p = create(config); instances.push(p); document.body.append(p.element); return p; };
    test("inherits a component-default format for display and input parsing", () => {
      setComponentDefaults("datepicker", { locale: "fr-FR", dateFormat: "YYYY-MM-DD" });
      const picker = mount({ value: "2026-09-15" });
      expect(picker.getFormattedValue()).toBe("2026-09-15");
      expect(picker.input.placeholder).toBe("YYYY-MM-DD");
      picker.input.value = "2026-09-16";
      picker.input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      expect(picker.getFormattedValue()).toBe("2026-09-16");
      expect(picker.input.getAttribute("aria-invalid")).not.toBe("true");
    });
    test("an instance format overrides the component default", () => {
      setComponentDefaults("datepicker", { locale: "fr-FR", dateFormat: "YYYY-MM-DD" });
      expect(mount({ value: "2026-09-15", dateFormat: "DD.MM.YYYY" }).getFormattedValue()).toBe("15.09.2026");
    });
    test("without a format, the configured locale still selects the pattern", () => {
      setComponentDefaults("datepicker", { locale: "fr-FR" });
      expect(mount({ value: "2026-09-15" }).getFormattedValue()).toBe("15/09/2026");
      clearGlobalDefaults();
      expect(mount({ value: "2026-09-15" }).getFormattedValue()).toBe("09/15/2026");
    });
  });
}

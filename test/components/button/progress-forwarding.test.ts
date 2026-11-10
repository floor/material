import { describe, expect, test } from "bun:test";
import "../../setup";
import createButton from "../../../src/components/button";
import { withAPI } from "../../../src/components/button/api";

const methods = [
  { name: "showProgress", arity: 0, async: true, args: [] },
  { name: "showProgressSync", arity: 0, async: false, args: [] },
  { name: "hideProgress", arity: 0, async: true, args: [] },
  { name: "hideProgressSync", arity: 0, async: false, args: [] },
  { name: "setProgress", arity: 1, async: true, args: [42] },
  { name: "setProgressSync", arity: 1, async: false, args: [42] },
  { name: "setIndeterminate", arity: 1, async: true, args: [true] },
  { name: "setIndeterminateSync", arity: 1, async: false, args: [true] },
  { name: "setLoading", arity: 2, async: true, args: [true, "Saving"] },
  { name: "setLoadingSync", arity: 2, async: false, args: [true, "Saving"] },
] as const;
type Input = Parameters<ReturnType<typeof withAPI>>[0];
type Method = (this: unknown, ...args: unknown[]) => unknown;
const disabled = { enable() {}, disable() {}, isDisabled: () => false };
const lifecycle = { destroy() {} };
const make = (name?: string, method?: Method) => {
  const component = {
    element: document.createElement("button"),
    getClass: (name: string) => `mtrl-${name}`,
    text: { setText() {}, getText: () => "", getElement: () => null },
    icon: { setIcon() {}, getIcon: () => "", getElement: () => null },
    ...(name ? { [name]: method } : {}),
  };
  const api = withAPI({ disabled, lifecycle })(component as unknown as Input);
  return { component: component as typeof component & Record<string, Method>, api };
};

describe("the button's progress forwarding contract", () => {
  test("progress methods are absent unless the underlying method exists", () => {
    const { api } = make();
    for (const { name } of methods) {
      expect(Object.hasOwn(api, name)).toBe(false);
      expect(api[name]).toBeUndefined();
    }
  });

  for (const spec of methods) {
    test(`${spec.name} preserves arity, kind, receiver, arguments and fluent return`, async () => {
      let receiver: unknown;
      let received: unknown[] = [];
      const { component, api } = make(spec.name, function (...args) {
        receiver = this;
        received = args;
        return "the internal return is not the public fluent value";
      });
      const forward = api[spec.name] as Method;
      expect(forward.length).toBe(spec.arity);
      expect(forward.name).toBe("");
      expect(forward.constructor.name).toBe(spec.async ? "AsyncFunction" : "Function");
      expect(Object.getOwnPropertyDescriptor(api, spec.name)).toEqual({
        value: forward, writable: true, enumerable: true, configurable: true,
      });
      const result = forward.call({ unrelated: true }, ...spec.args, "ignored extra argument");
      expect(receiver).toBe(component);
      expect(received).toEqual([...spec.args]);
      expect(result instanceof Promise).toBe(spec.async);
      expect(await result).toBe(api);
      // Explicit undefined arguments are passed even when the public caller omits them.
      expect(await forward()).toBe(api);
      expect(received).toEqual(Array(spec.arity).fill(undefined));
    });

    test(`${spec.name} reads the current delegate and preserves its errors`, async () => {
      const { component, api } = make(spec.name, () => "original");
      const error = new Error(spec.name);
      component[spec.name] = function () {
        expect(this).toBe(component);
        throw error;
      };
      const forward = api[spec.name] as Method;
      if (spec.async) await expect(forward(...spec.args)).rejects.toBe(error);
      else expect(() => forward(...spec.args)).toThrow(error);
    });

    if (spec.async) test(`${spec.name} calls immediately, awaits settlement and keeps rejection identity`, async () => {
      let resolve!: (value: unknown) => void;
      const pending = new Promise(done => { resolve = done; });
      const order: string[] = [];
      const { component, api } = make(spec.name, () => { order.push("delegate"); return pending; });
      const forward = api[spec.name] as Method;
      const result = forward(...spec.args) as Promise<unknown>;
      result.then(() => order.push("public resolved"));
      expect(order).toEqual(["delegate"]);
      await Promise.resolve();
      expect(order).toEqual(["delegate"]);
      resolve("not the public return");
      expect(await result).toBe(api);
      expect(order).toEqual(["delegate", "public resolved"]);
      const error = new Error("load rejected");
      component[spec.name] = () => Promise.reject(error);
      await expect(forward(...spec.args)).rejects.toBe(error);
    });
  }

  test("the real button keeps the ten optional methods in their original order", () => {
    const button = createButton({ text: "Save", progress: true });
    expect(Object.keys(button).filter(key => methods.some(method => method.name === key)))
      .toEqual(methods.map(method => method.name));
    for (const spec of methods) {
      expect(button[spec.name]?.length).toBe(spec.arity);
      expect(button[spec.name]?.name).toBe("");
    }
    button.destroy();
  });

  test("default, labelled and progress-enabled initial HTML stays byte-identical to main", () => {
    const empty = '<button class="mtrl-button mtrl-button--filled mtrl-button--s mtrl-button--round" type="button"><div class="mtrl-ripple"></div></button>';
    const labelled = '<button class="mtrl-button mtrl-button--filled mtrl-button--s mtrl-button--round" type="button"><span class="mtrl-button__text">Save</span><div class="mtrl-ripple"></div></button>';
    for (const [config, html] of [[{}, empty], [{ text: "Save" }, labelled], [{ text: "Save", progress: true }, labelled]] as const) {
      const button = createButton(config);
      expect(button.element.outerHTML).toBe(html);
      button.destroy();
    }
  });
});

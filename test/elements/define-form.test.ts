// test/elements/define-form.test.ts
//
// Form participation lives in define-form.ts: `defineElement` refuses a spec
// with `form` at definition time and names `defineFormElement`, which defines
// the same spec with the form machinery. The authoring API is experimental,
// so the refusal is a minor-release change to it; it is pinned here, and the
// form browser checks pin the semantics.
import { describe, expect, test } from "bun:test";
import { defineElement, type ElementComponent, type ElementSpec } from "../../src/elements/define";

const probe = (form: boolean): ElementSpec<ElementComponent> => ({
  name: "probe",
  create: () => ({ element: null as unknown as HTMLElement, destroy: () => {} }),
  styles: [],
  ...(form ? { form: { value: () => null } } : {}),
});

describe("defineElement and form specs", () => {
  test("a spec with form is refused at definition time, naming defineFormElement", () => {
    expect(() => defineElement(probe(true))).toThrow(/defineFormElement/);
  });

  test("a form-free spec is defined as before", () => {
    expect(defineElement(probe(false)).spec.name).toBe("probe");
  });

  test("defineFormElement defines the form spec, lazily", async () => {
    const { defineFormElement } = await import("../../src/elements/define-form");
    const definition = defineFormElement(probe(true));
    expect(definition.spec.name).toBe("probe");
    expect(typeof definition.spec.form?.value).toBe("function");
  });
});

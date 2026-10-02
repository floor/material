// test/scripts/component-hosts.test.ts
//
// FLO-561. `suppressHydrationWarning` hides every attribute mismatch on a
// component host. The React checks replace that with a comparison. A live
// property is an attribute in server markup and a property on the client, so
// the comparison has to read the property. Dropping the attribute compares
// the server value with nothing.

import { describe, expect, test } from "bun:test";
import { clientAttributes, comparableAttributes, type ComponentHost } from "../../scripts/fixtures/component-hosts";

const host = (
  attrs: Record<string, string>,
  props: ComponentHost["props"] = {},
): ComponentHost => ({ tag: "m-example", ssr: false, attrs, props });

const agree = (hydrated: ComponentHost, client: ComponentHost): void => {
  expect(comparableAttributes(hydrated, client)).toEqual(clientAttributes(client));
};

const differ = (hydrated: ComponentHost, client: ComponentHost): void => {
  expect(comparableAttributes(hydrated, client)).not.toEqual(clientAttributes(client));
};

describe("comparableAttributes", () => {
  test("reports a hydrated value that differs from the client property", () => {
    differ(host({ value: "a" }), host({}, { value: "b" }));
  });

  test("passes when the string values are equal", () => {
    agree(host({ value: "a" }), host({}, { value: "a" }));
  });

  test("compares a boolean attribute by presence", () => {
    agree(host({ checked: "" }), host({}, { checked: true }));
    agree(host({ checked: "checked" }), host({}, { checked: true }));
    agree(host({}), host({}, { checked: false }));
    differ(host({ checked: "" }), host({}, { checked: false }));
    differ(host({}), host({}, { checked: true }));
  });

  test("compares a number property with the attribute text", () => {
    agree(host({ value: "30" }), host({}, { value: 30 }));
    differ(host({ value: "30" }), host({}, { value: 31 }));
    agree(host({ "second-value": "80" }), host({}, { secondValue: 80 }));
    agree(host({}), host({}, { secondValue: null }));
    differ(host({ "second-value": "1" }), host({}, { secondValue: null }));
  });

  test("keeps an attribute when the element has no such property", () => {
    differ(host({ value: "on" }), host({}));
    agree(host({ value: "on" }), host({ value: "on" }));
  });

  test("still ignores style serialization and nonce", () => {
    agree(host({ style: "margin-top:4px", nonce: "abc" }), host({ style: "margin-top: 4px;" }));
  });

  // No attribute: each element's own property. Two defaults agree. A hydrated
  // element with nothing recorded does not take the client's value.
  test("compares an absent attribute with each element's property", () => {
    agree(host({}, { value: 0 }), host({}, { value: 0 }));
    differ(host({}, { value: 0 }), host({}, { value: 2 }));
    differ(host({}), host({}, { value: "b" }));
  });
});

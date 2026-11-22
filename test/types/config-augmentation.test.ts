// test/types/config-augmentation.test.ts
//
// A consumer may augment a component's config with its own options. The
// deprecated config names keep interface declarations, so `declare module`
// merging still compiles; the field below is read from the augmented type, so
// this file stops type-checking if either name becomes a type alias.
import { describe, expect, test } from "bun:test";
import type { DrawerConfig } from "../../src/components/drawer/types";
import type { TopAppBarConfig } from "../../src/components/top-app-bar/types";

declare module "../../src/components/drawer/types" {
  interface DrawerConfig {
    consumerDrawerOption?: string;
  }
}

declare module "../../src/components/top-app-bar/types" {
  interface TopAppBarConfig {
    consumerAppBarOption?: string;
  }
}

describe("a consumer's module augmentation of a deprecated config", () => {
  test("the drawer's old config name still takes the consumer's own option", () => {
    const config: DrawerConfig = { consumerDrawerOption: "mine" };
    expect(config.consumerDrawerOption).toBe("mine");
  });

  test("the app bar's old config name still takes the consumer's own option", () => {
    const config: TopAppBarConfig = { consumerAppBarOption: "mine" };
    expect(config.consumerAppBarOption).toBe("mine");
  });
});

// test/types/config-augmentation.test.ts
//
// A consumer may augment a component's types with its own options. The legacy
// names keep the interface declarations (the new names are aliases of them),
// so `declare module` merging compiles and the new names see the consumer's
// fields too. The consumer below is type-checked in a program of its own, so
// the augmentation cannot disturb the exact-key fixtures that read the same
// types; it reads every augmented member, so the program fails to compile if a
// legacy name stops being an interface, or a factory stops taking it.
import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const root = join(import.meta.dir, "../..");

const CONSUMER = `
import { createDrawer, createNavigationDrawer } from "src/components/drawer";
import { createTopAppBar, createAppBar } from "src/components/top-app-bar";
import type {
  DrawerComponent, DrawerConfig, DrawerEvents, DrawerItemConfig,
  DrawerSectionEvent, DrawerSelectEvent, TopAppBarComponent, TopAppBarConfig,
} from "src/components";

declare module "src/components/drawer/types" {
  interface DrawerConfig { consumerDrawerOption?: string }
  interface DrawerComponent { consumerDrawerMethod?: () => string }
  interface DrawerItemConfig { consumerItemOption?: string }
  interface DrawerEvents { consumer: (payload: { value: string }) => void }
  interface DrawerSelectEvent { consumerSelectDetail?: string }
  interface DrawerSectionEvent { consumerSectionDetail?: string }
}

declare module "src/components/top-app-bar/types" {
  interface TopAppBarConfig { consumerAppBarOption?: string }
  interface TopAppBarComponent { consumerAppBarMethod?: () => string }
}

const drawerConfig: DrawerConfig = { consumerDrawerOption: "mine" };
const drawer = createDrawer(drawerConfig);
drawer.destroy();
const drawerAgain = createNavigationDrawer({ consumerDrawerOption: "mine" });
drawerAgain.destroy();
const barConfig: TopAppBarConfig = { consumerAppBarOption: "mine" };
const bar = createTopAppBar(barConfig);
bar.destroy();
const barAgain = createAppBar({ consumerAppBarOption: "mine" });
barAgain.destroy();

declare const drawerComponent: DrawerComponent;
void drawerComponent.consumerDrawerMethod;
const item: DrawerItemConfig = { consumerItemOption: "mine" };
void item.consumerItemOption;
const events = null as unknown as DrawerEvents;
void events.consumer;
const select = null as unknown as DrawerSelectEvent;
void select.consumerSelectDetail;
const section = null as unknown as DrawerSectionEvent;
void section.consumerSectionDetail;
declare const barComponent: TopAppBarComponent;
void barComponent.consumerAppBarMethod;
`;

describe("a consumer's module augmentation of the legacy types", () => {
  test("compiles, and both factories and the new aliases take the augmented types", async () => {
    const directory = await mkdtemp(join(tmpdir(), "config-augmentation-"));
    const entry = join(directory, "consumer.ts");
    await writeFile(entry, CONSUMER);
    const options = {
      strict: true, skipLibCheck: true, noEmit: true,
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      baseUrl: root,
    } satisfies ts.CompilerOptions;
    const program = ts.createProgram([entry], options);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    expect(diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))).toEqual([]);
  }, 60_000);
});

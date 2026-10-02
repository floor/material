// test/types/canonical-names.fixture.ts
//
// FLO-383 PR B: 1.0 has only the canonical names. 0.10.5 exported both
// spellings (PR A, A2); the old ones are gone from every entry, and the
// factory's TopAppBarComponent chains as it did.
import {
  createTextField, createTopAppBar,
  type TextFieldConfig, type TextFieldComponent, type CardConfig,
  type TopAppBarComponent, type BottomAppBarComponent,
} from "../../src";
// @ts-expect-error createTextfield is createTextField in 1.0
import { createTextfield } from "../../src";
// @ts-expect-error TextfieldConfig is TextFieldConfig in 1.0
import type { TextfieldConfig } from "../../src";
// @ts-expect-error CardSchema is CardConfig in 1.0
import type { CardSchema } from "../../src";
// @ts-expect-error TopAppBar is TopAppBarComponent in 1.0
import type { TopAppBar } from "../../src";
// @ts-expect-error BottomAppBar is BottomAppBarComponent in 1.0
import type { BottomAppBar } from "../../src";

export const field: TextFieldComponent = createTextField({ label: "Name" } satisfies TextFieldConfig);
export const card: CardConfig = { variant: "outlined" };
export const chained: TopAppBarComponent = createTopAppBar().setTitle("Inbox").setType("medium");
export type Bottom = BottomAppBarComponent;
export type Gone = [typeof createTextfield, TextfieldConfig, CardSchema, TopAppBar, BottomAppBar];

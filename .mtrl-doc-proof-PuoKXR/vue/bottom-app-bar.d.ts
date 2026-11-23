import "material/elements/css/bottom-app-bar";
import { type BottomAppBarSpec, type BottomAppBarElement } from "../elements/bottom-app-bar.js";
import { type MComponent } from "./create.js";
/** @deprecated Material Design 3 Expressive replaces the bottom app bar with the docked toolbar. Use MToolbar with variant="docked" placement="bottom" instead. A centred FAB, adding a FAB after creation, a custom transition duration and a custom tag are not yet available on the docked toolbar. */
export declare const MBottomAppBar: MComponent<BottomAppBarSpec, BottomAppBarElement>;

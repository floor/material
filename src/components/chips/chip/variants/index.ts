import type { ChipType } from "../../types";
import type { ChipMount } from "../variant";
import { filterMount } from "./filter";
import { inputMount } from "./input";

/**
 * The mounts by chip type. The set makes every variant, so it is the one place
 * that names them all; a factory imports only its own, and assist and
 * suggestion chips add nothing, so their module is the core alone.
 */
export const chipMount = (type: ChipType | undefined): ChipMount | undefined =>
  type === "input" ? inputMount : type === "filter" || type === undefined ? filterMount : undefined;

import { DEFAULT_PREFIX, preupgradeSheet } from "../styles";

// Filled with the compiled profile by buildStyles, outside the default module.
declare const preupgradeCss: string;

/** The pre-upgrade stylesheet for the opt-in typography profile. */
export const preupgradeStyles = (prefix: string = DEFAULT_PREFIX): string => preupgradeSheet(preupgradeCss, [prefix]);

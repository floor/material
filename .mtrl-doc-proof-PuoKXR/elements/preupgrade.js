import { DEFAULT_PREFIX, preupgradeCss, preupgradeSheet } from "./styles.js";
/** The pre-upgrade stylesheet (elements/preupgrade.css) for a tag prefix, default "m". */
export const preupgradeStyles = (prefix = DEFAULT_PREFIX) => preupgradeSheet(preupgradeCss, [prefix]);

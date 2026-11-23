/** Main mtrl library exports The root is the components and the few helpers an app configures them with. */
export * from "./components/index.js";
export { setComponentDefaults, getComponentDefaults, setGlobalDefaults, clearGlobalDefaults, setIcons, getIcon, schemeToTokens, THEME_ROLES, configureHTML } from "./core/index.js";
export type { ThemeRole, SchemeRoles, SchemeToTokensOptions, ThemeTokens, ComponentConfigMap, HTMLPolicy, HTMLInput, TrustedHTMLLike, IconName, IconOverrides } from "./core/index.js";

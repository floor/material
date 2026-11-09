// Whether the factory name walk is on. Search reads this when it paints a
// named icon. `enableDecorativeIcons` sets it. The button and text-field
// graphs do not import this module, so their default bundles stay unchanged.

let on = false;

/** True once `enableDecorativeIcons` has run in this bundle. */
export const decorativeIconsOn = (): boolean => on;

/** Called only from the opt-in module. */
export const setDecorativeIcons = (value: boolean): void => {
  on = value;
};

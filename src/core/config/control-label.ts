/** Only the four form factories opt in; default config and DOM stay unchanged. */
export const controlLabelConfig = <T extends { ariaLabel?: string; controlLabelOnly?: boolean }>(config: T) =>
  config.controlLabelOnly === true ? { ...config, ariaLabel: undefined } : config;

/** Only new wrapper configs change; the input's config and default DOM stay intact. */
export function controlLabelConfig<T extends { ariaLabel?: string }>(wrapper: T, controlOnly?: boolean): T {
  if (controlOnly) wrapper.ariaLabel = undefined;
  return wrapper;
}

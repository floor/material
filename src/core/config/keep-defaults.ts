import { getComponentDefaults, type ComponentConfigMap } from "./global";

/**
 * Restores values overwritten with undefined after the normal config merge.
 * A defined global default wins over a built-in one, including null and false.
 */
export const keepDefaults = <T extends object>(
  merged: T,
  defaults: T,
  componentName: string,
): T => {
  const target = merged as Record<PropertyKey, unknown>;
  const builtInDefaults = defaults as Record<PropertyKey, unknown>;
  const globalDefaults = getComponentDefaults(componentName as keyof ComponentConfigMap) as Record<PropertyKey, unknown>;
  const isEnumerable = Object.prototype.propertyIsEnumerable;
  for (const key of Reflect.ownKeys(target)) {
    // The merge resolves className separately and may remove the class alias.
    if (key === "className" || target[key] !== undefined) continue;
    const globalValue = isEnumerable.call(globalDefaults, key) ? globalDefaults[key] : undefined;
    target[key] = globalValue === undefined && isEnumerable.call(builtInDefaults, key)
      ? builtInDefaults[key]
      : globalValue;
  }
  return merged;
};

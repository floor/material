/**
 * Checks if a value is a plain object
 * @param value
 */
export declare const isObject: (value: unknown) => value is Record<string, unknown>;
/**
 * Accesses a nested property of an object using a string path
 * @param obj
 * @param path
 */
export declare const byString: <T extends object, R = unknown>(obj: T, path: string) => R | undefined;

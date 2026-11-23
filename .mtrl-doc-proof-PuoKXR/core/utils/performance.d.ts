export type Cancellable<F> = F & {
    cancel(): void;
};
/**
 * Creates a throttled function that only invokes the provided function at most once per every specified wait milliseconds.
 * @param fn
 * @param wait
 * @param options
 * @param options.leading
 * @param options.trailing
 */
export declare const throttle: <T extends (...args: never[]) => unknown>(fn: T, wait: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}) => Cancellable<(...args: Parameters<T>) => void>;
/**
 * Creates a debounced function that delays invoking the provided function until after the specified wait milliseconds have elapsed since the last time it was invoked.
 * @param fn
 * @param wait
 * @param options
 * @param options.leading
 * @param options.maxWait
 */
export declare const debounce: <T extends (...args: never[]) => unknown>(fn: T, wait: number, options?: {
    leading?: boolean;
    maxWait?: number;
}) => Cancellable<(...args: Parameters<T>) => void>;
/**
 * Creates a function that is restricted to invoking the provided function once.
 * @param fn
 */
export declare const once: <T extends (...args: never[]) => unknown>(fn: T) => ((...args: Parameters<T>) => ReturnType<T>);

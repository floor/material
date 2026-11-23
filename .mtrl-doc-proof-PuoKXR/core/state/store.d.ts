/** State store options */
export interface StoreOptions<T> {
    /** Middleware functions that process state changes */
    middleware?: Array<(newState: T, oldState: T) => T>;
}
/** State selector function type */
export type Selector<T, R> = (state: T) => R;
/** State computation function type for derived state */
export type Computation<T, R> = (state: T) => R;
/** State updater function type */
export type Updater<T> = (state: T) => T;
/** What derive() returns: call it to remove the derived value, or read the value, typed, through get(). */
export type DerivedState<R> = (() => void) & {
    get: () => R;
};
/** State store interface */
export interface Store<T> {
    /** Gets current state including derived values */
    getState: <D extends object = Record<never, never>>() => T & D;
    /**
 * Updates state
 * @param update
 */
    setState: (update: Partial<T> | Updater<T>) => void;
    /**
 * Subscribes to state changes
 * @param listener
 */
    subscribe: (listener: (state: T, oldState: T) => void) => () => void;
    /**
 * Creates a derived state value
 * @param key
 * @param computation
 */
    derive: <K extends string, R>(key: K, computation: Computation<T, R>) => DerivedState<R>;
    /**
 * Selects a specific slice of state
 * @param selector
 */
    select: <R>(selector: Selector<T, R>) => R;
    /** Resets state to initial values */
    reset: () => void;
}
/**
 * Creates a state store with support for derived state and middleware
 * @param initialState
 * @param options
 */
export declare const createStore: <T extends object>(initialState?: T, options?: StoreOptions<T>) => Store<T>;
/**
 * Example middleware that logs state changes
 * @param newState
 * @param oldState
 */
export declare const loggingMiddleware: <T extends object>(newState: T, oldState: T) => T;
/**
 * Creates a derived state selector for filtering objects
 * @param predicate
 */
export declare const deriveFiltered: <T>(predicate: (value: T, key: string) => boolean) => (state: Record<string, T>) => Record<string, T>;

import { createEmitter } from "./emitter.js";
export const createStore = (initialState = {}, options = {}) => {
    let state = { ...initialState };
    const emitter = createEmitter();
    const derivedStates = new Map();
    const middleware = options.middleware || [];
    const notifyListeners = (newState, oldState) => {
        emitter.emit('change', newState, oldState);
    };
    const applyMiddleware = (newState, oldState) => {
        return middleware.reduce((state, fn) => fn(state, oldState), newState);
    };
    return {
        getState: () => {
            const derivedValues = {};
            derivedStates.forEach((compute, key) => {
                derivedValues[key] = compute(state);
            });
            return { ...state, ...derivedValues };
        },
        setState: (update) => {
            const oldState = { ...state };
            const newState = typeof update === 'function'
                ? update(state)
                : { ...state, ...update };
            state = applyMiddleware(newState, oldState);
            notifyListeners(state, oldState);
        },
        subscribe: (listener) => emitter.on('change', listener),
        derive: (key, computation) => {
            derivedStates.set(key, computation);
            const remove = () => {
                derivedStates.delete(key);
            };
            return Object.assign(remove, { get: () => computation(state) });
        },
        select: (selector) => selector(state),
        reset: () => {
            state = { ...initialState };
            notifyListeners(state, {});
        }
    };
};
export const loggingMiddleware = (newState, oldState) => {
    console.log('State change:', {
        old: oldState,
        new: newState,
        diff: Object.keys(newState).reduce((acc, key) => {
            if (newState[key] !== oldState[key]) {
                acc[key] = { from: oldState[key], to: newState[key] };
            }
            return acc;
        }, {})
    });
    return newState;
};
export const deriveFiltered = (predicate) => (state) => Object.keys(state).reduce((acc, key) => {
    if (predicate(state[key], key)) {
        acc[key] = state[key];
    }
    return acc;
}, {});

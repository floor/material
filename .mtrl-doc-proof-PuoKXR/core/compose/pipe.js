export function pipe(...fns) {
    return (x) => fns.reduce((v, f) => f(v), x);
}
export function compose(...fns) {
    return (x) => fns.reduceRight((v, f) => f(v), x);
}
export const transform = (...transformers) => (obj, context = {}) => transformers.reduce((acc, transformer) => ({
    ...acc,
    ...transformer(acc, context)
}), obj);

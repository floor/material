/** A resource scope shared by every stage of a component's composition. */
export interface CleanupScope {
    readonly destroyed: boolean;
    add(cleanup: () => void): void;
    destroy(): void;
}
export declare const createCleanup: () => CleanupScope;
/** Also support custom component bases that already provide a lifecycle. */
export declare const getCleanup: (component: {
    resources?: CleanupScope;
    lifecycle?: {
        destroy(): void;
    };
}) => CleanupScope;

/** Common canvas context interface used by components */
export interface CanvasContext {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    pixelRatio: number;
}
/**
 * Creates and initializes a canvas context with proper pixel ratio handling
 * @param canvas
 * @param width
 * @param height
 */
export declare const createCanvasContext: (canvas: HTMLCanvasElement, width: number, height: number) => CanvasContext;
/**
 * Updates canvas dimensions while preserving pixel ratio
 * @param context
 * @param width
 * @param height
 */
export declare const updateCanvasDimensions: (context: CanvasContext, width: number, height: number) => void;
/**
 * Tries to initialize a canvas with retry mechanism
 * @param initFn
 * @param onSuccess
 * @param signal
 */
export declare const initializeCanvasWithRetry: (initFn: () => boolean, onSuccess?: () => void, signal?: AbortSignal) => boolean;
/**
 * Creates a theme observer that triggers a callback on theme changes
 * @param _color
 * @param callback
 */
export declare const createCanvasThemeObserver: (_color: string, callback: () => void) => (() => void);
/** Standard animation frame manager for components */
export declare class AnimationFrameManager {
    private animationId;
    /**
 * Starts an animation loop
 * @param callback
 */
    start(callback: (timestamp: number) => void): void;
    /** Stops the animation loop */
    stop(): void;
    /** Whether animation is currently running */
    get isRunning(): boolean;
}
/** Manages multiple cleanup functions for components */
export declare class CleanupManager {
    private cleanupFunctions;
    /** Adds a cleanup function */
    add(cleanup: (() => void) | null | undefined): void;
    /** Runs all cleanup functions and clears the list */
    cleanup(): void;
}
/**
 * Creates a standard canvas element with common styles
 * @param className
 * @param additionalStyles
 */
export declare const createStyledCanvas: (className: string, additionalStyles?: Partial<CSSStyleDeclaration>) => HTMLCanvasElement;

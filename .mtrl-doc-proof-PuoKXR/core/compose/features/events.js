import { getCleanup } from "../cleanup.js";
import { createEmitter } from "../../state/emitter.js";
export const withEvents = () => (component) => {
    const emitter = createEmitter();
    const resources = getCleanup(component);
    resources.add(() => emitter.clear());
    return {
        ...component,
        on(event, handler) {
            if (!resources.destroyed)
                emitter.on(event, handler);
            return this;
        },
        off(event, handler) {
            emitter.off(event, handler);
            return this;
        },
        emit(event, data) {
            emitter.emit(event, data);
            return this;
        }
    };
};

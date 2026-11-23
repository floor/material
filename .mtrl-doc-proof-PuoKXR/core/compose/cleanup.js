export const createCleanup = () => {
    let callbacks;
    let destroyed = false;
    return {
        get destroyed() { return destroyed; },
        add(cleanup) {
            if (destroyed)
                cleanup();
            else
                (callbacks ??= []).push(cleanup);
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            const pending = callbacks;
            callbacks = undefined;
            let failure;
            let failed = false;
            for (const cleanup of pending ?? []) {
                try {
                    cleanup();
                }
                catch (error) {
                    if (!failed)
                        failure = error;
                    failed = true;
                }
            }
            if (failed)
                throw failure;
        },
    };
};
export const getCleanup = (component) => {
    if (component.resources)
        return component.resources;
    const resources = component.resources = createCleanup();
    if (component.lifecycle) {
        const destroy = component.lifecycle.destroy.bind(component.lifecycle);
        component.lifecycle.destroy = () => {
            try {
                resources.destroy();
            }
            finally {
                destroy();
            }
        };
    }
    return resources;
};

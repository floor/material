import { addClass, removeClass } from "../../../core/dom/index.js";
const createProgressLazy = async (config) => {
    const { default: createProgress } = await import("../../progress/progress.js");
    return createProgress(config);
};
export const withProgress = (config) => (component) => {
    if (!config.progress && !config.loading) {
        return component;
    }
    const { on, ...restConfig } = (typeof config.progress === "object" ? config.progress : {});
    const progressConfig = {
        variant: "circular", size: 20, thickness: 2, indeterminate: true,
        ...restConfig,
        minSize: 20,
    };
    let progress = null;
    let progressPromise = null;
    let isLoading = !!config.loading;
    let wasDisabled;
    let originalText;
    const markLoading = () => {
        wasDisabled ??= component.element.disabled;
        component.element.setAttribute("aria-busy", "true");
        component.disabled?.disable();
    };
    if (isLoading) {
        markLoading();
    }
    const ensureProgress = async () => {
        if (progress)
            return progress;
        if (!progressPromise) {
            progressPromise = createProgressLazy(progressConfig).then((p) => {
                progress = p;
                addClass(p.element, component.getClass("button__progress"));
                p.element.style.display = "none";
                for (const [event, handler] of Object.entries(on ?? {})) {
                    if (handler)
                        p.on(event, handler);
                }
                component.progress = p;
                return p;
            });
        }
        return progressPromise;
    };
    const getIconElement = () => component.element.querySelector(`.${component.getClass("button__icon")}`);
    const showProgress = async () => {
        const p = await ensureProgress();
        const iconElement = getIconElement();
        if (!component.element.contains(p.element)) {
            component.element.insertBefore(p.element, iconElement?.nextSibling ?? component.element.firstChild);
        }
        p.element.style.display = "";
        addClass(component.element, `${component.getClass("button")}--progress`);
        if (iconElement instanceof HTMLElement) {
            iconElement.style.display = "none";
        }
        return component;
    };
    component.showProgress = showProgress;
    component.showProgressSync = () => {
        void showProgress();
        return component;
    };
    const hideProgress = async () => {
        if (!progress)
            return component;
        progress.element.style.display = "none";
        removeClass(component.element, `${component.getClass("button")}--progress`);
        const iconElement = getIconElement();
        if (iconElement instanceof HTMLElement) {
            iconElement.style.display = "";
        }
        return component;
    };
    component.hideProgress = hideProgress;
    component.hideProgressSync = () => {
        void hideProgress();
        return component;
    };
    const setProgress = async (value) => {
        const p = await ensureProgress();
        p.setValue(value);
        return component;
    };
    component.setProgress = setProgress;
    component.setProgressSync = (value) => {
        void setProgress(value);
        return component;
    };
    const setIndeterminate = async (indeterminate) => {
        const p = await ensureProgress();
        p.setIndeterminate(indeterminate);
        return component;
    };
    component.setIndeterminate = setIndeterminate;
    component.setIndeterminateSync = (indeterminate) => {
        void setIndeterminate(indeterminate);
        return component;
    };
    const setLoading = async (loading, text) => {
        if (loading !== isLoading || (loading && originalText === undefined)) {
            isLoading = loading;
            if (loading) {
                originalText = (component.text ? component.text.getText() : component.getText?.()) ?? "";
                markLoading();
                await showProgress();
            }
            else {
                component.element.removeAttribute("aria-busy");
                await hideProgress();
                if (!wasDisabled)
                    component.disabled?.enable();
                wasDisabled = undefined;
            }
            if (!loading)
                text ||= originalText;
            if (text) {
                if (component.text)
                    component.text.setText(text);
                else
                    component.setText?.(text);
            }
        }
        return component;
    };
    component.setLoading = setLoading;
    component.setLoadingSync = (loading, text) => {
        void setLoading(loading, text);
        return component;
    };
    if (component.lifecycle) {
        const originalDestroy = component.lifecycle.destroy;
        component.lifecycle.destroy = () => {
            if (progress) {
                progress.destroy();
                if (progress.element.parentNode)
                    progress.element.parentNode.removeChild(progress.element);
            }
            originalDestroy();
        };
    }
    if (config.showProgress) {
        void ensureProgress().then(() => showProgress());
    }
    return component;
};

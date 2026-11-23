export const withAPI = () => (component) => {
    const api = {
        element: component.element,
        slides: component.slides,
        lifecycle: { destroy: () => component.lifecycle?.destroy() },
        getClass: component.getClass,
        next() {
            component.next();
            return api;
        },
        prev() {
            component.prev();
            return api;
        },
        goTo(index) {
            component.goTo(index);
            return api;
        },
        setWheel(on) {
            component.setWheel(on);
            return api;
        },
        getCurrentSlide: () => component.getCurrentSlide(),
        getValue: () => component.getCurrentSlide(),
        getVariant: () => component.getVariant(),
        addSlide(slide, index) {
            component.slides.addSlide(slide, index);
            return api;
        },
        removeSlide(index) {
            component.slides.removeSlide(index);
            return api;
        },
        destroy() {
            component.lifecycle?.destroy();
        },
        on(event, handler) {
            component.on?.(event, handler);
            return api;
        },
        off(event, handler) {
            component.off?.(event, handler);
            return api;
        },
        addClass(...classes) {
            component.element.classList.add(...classes);
            return api;
        },
    };
    return api;
};

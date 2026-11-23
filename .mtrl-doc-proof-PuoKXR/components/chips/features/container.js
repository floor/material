export const withContainer = (config) => (component) => {
    const state = {
        scrollable: config.scrollable === true,
        vertical: config.vertical === true
    };
    return {
        ...component,
        layout: {
            setScrollable(isScrollable) {
                state.scrollable = isScrollable;
                if (component.element) {
                    if (isScrollable) {
                        component.element.classList.add(`${component.getClass('chips')}--scrollable`);
                    }
                    else {
                        component.element.classList.remove(`${component.getClass('chips')}--scrollable`);
                    }
                }
                return this;
            },
            isScrollable() {
                return state.scrollable;
            },
            setVertical(isVertical) {
                state.vertical = isVertical;
                if (component.element) {
                    if (isVertical) {
                        component.element.classList.add(`${component.getClass('chips')}--vertical`);
                    }
                    else {
                        component.element.classList.remove(`${component.getClass('chips')}--vertical`);
                    }
                }
                return this;
            },
            isVertical() {
                return state.vertical;
            }
        }
    };
};

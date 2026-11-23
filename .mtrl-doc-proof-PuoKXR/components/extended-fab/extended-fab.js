import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withIcon, withVariant, withRipple, withDisabled, withLifecycle, withText } from "../../core/compose/features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig, getApiConfig } from "./config.js";
const createExtendedFab = (config = {}) => {
    const fabConfig = createBaseConfig(config);
    const setupScrollCollapse = (component) => {
        if (fabConfig.collapseOnScroll) {
            let lastScrollY = window.scrollY;
            let ticking = false;
            const scrollThreshold = 10;
            const handleScroll = () => {
                if (!ticking) {
                    window.requestAnimationFrame(() => {
                        const currentScrollY = window.scrollY;
                        const scrollDelta = currentScrollY - lastScrollY;
                        if (scrollDelta > scrollThreshold) {
                            component.collapse();
                        }
                        else if (scrollDelta < -scrollThreshold) {
                            component.expand();
                        }
                        if (currentScrollY <= 0) {
                            component.expand();
                        }
                        lastScrollY = currentScrollY;
                        ticking = false;
                    });
                    ticking = true;
                }
            };
            window.addEventListener('scroll', handleScroll, { passive: true });
            requestAnimationFrame(() => {
                component.expand();
            });
            const originalDestroy = component.destroy;
            component.destroy = () => {
                window.removeEventListener('scroll', handleScroll);
                originalDestroy.call(component);
            };
        }
    };
    try {
        const extendedFab = pipe(createBase, withEvents(), withElement(getElementConfig(fabConfig)), withVariant(fabConfig), withIcon(fabConfig), component => withText({
            ...fabConfig,
            beforeElement: fabConfig.iconPosition === 'end'
                ? component.icon.getElement() ?? undefined
                : undefined,
        })(component), withDisabled(fabConfig), withRipple(fabConfig), withLifecycle(), comp => withAPI(getApiConfig(comp))(comp))(fabConfig);
        setupScrollCollapse(extendedFab);
        return extendedFab;
    }
    catch (error) {
        console.error('Extended FAB creation error:', error);
        throw new Error(`Failed to create Extended FAB: ${error.message}`);
    }
};
export default createExtendedFab;

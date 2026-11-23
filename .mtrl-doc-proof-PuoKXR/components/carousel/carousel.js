import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withSlides, withScroll } from "./features/index.js";
import { withAPI } from "./api.js";
import { createBaseConfig, getElementConfig } from "./config.js";
export const createCarousel = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    return pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withSlides(baseConfig), withLifecycle(), withScroll(baseConfig), withAPI())(baseConfig);
};
export default createCarousel;

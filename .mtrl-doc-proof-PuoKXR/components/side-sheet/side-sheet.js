import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withStructure, withState } from "./features/index.js";
import { withAPI, applyEventHandlers } from "./api.js";
import { createBaseConfig, getElementConfig } from "./config.js";
const createSideSheet = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    const component = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withStructure(baseConfig), withState(baseConfig), withLifecycle())(baseConfig);
    applyEventHandlers(component, baseConfig.on);
    return withAPI({
        state: component.state,
        structure: component.structure,
        lifecycle: { destroy: component.lifecycle?.destroy ?? (() => { }) },
    })(component);
};
export default createSideSheet;

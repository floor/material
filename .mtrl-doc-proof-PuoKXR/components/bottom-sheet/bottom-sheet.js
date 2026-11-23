import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
import { withStructure, withState, withDrag } from "./features/index.js";
import { withAPI, applyEventHandlers } from "./api.js";
import { createBaseConfig, getElementConfig } from "./config.js";
const createBottomSheet = (config = {}) => {
    const baseConfig = createBaseConfig(config);
    const component = pipe(createBase, withEvents(), withElement(getElementConfig(baseConfig)), withStructure(baseConfig), withState(baseConfig), withDrag(), withLifecycle())(baseConfig);
    applyEventHandlers(component, baseConfig.on);
    return withAPI({
        state: component.state,
        structure: component.structure,
        drag: component.drag,
        lifecycle: { destroy: component.lifecycle?.destroy ?? (() => { }) },
    })(component);
};
export default createBottomSheet;

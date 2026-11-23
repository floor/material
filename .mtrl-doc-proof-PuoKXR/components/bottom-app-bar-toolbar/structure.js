import { pipe } from "../../core/compose/pipe.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { withEvents, withLifecycle } from "../../core/compose/features/index.js";
export function createToolbarStructure(settings, options, barClass, attributes) {
    const component = pipe(createBase, withEvents(), withElement(options), withLifecycle())(settings);
    const bar = document.createElement("div");
    bar.className = barClass;
    for (const [name, value] of Object.entries(attributes))
        bar.setAttribute(name, value);
    component.element.appendChild(bar);
    return { component, bar };
}
export function createToolbarFab(root, className, before = null) {
    const fab = document.createElement("div");
    fab.className = className;
    root.insertBefore(fab, before);
    return fab;
}

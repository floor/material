export const eventWithin = (config, node, event) => config.layer === "top"
    ? event.composedPath().includes(node)
    : node.contains(event.target);
export const focusWithin = (config, node, target) => {
    if (!target)
        return false;
    if (node.contains(target))
        return true;
    if (config.layer !== "top")
        return false;
    for (let root = node.getRootNode(); "host" in root; root = root.host.getRootNode()) {
        if (root.host === target)
            return true;
    }
    return false;
};

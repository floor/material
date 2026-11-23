const configStore = {};
export function setComponentDefaults(component, config) {
    configStore[component] = config;
}
export function getComponentDefaults(component) {
    return configStore[component] || {};
}
export function setGlobalDefaults(configs) {
    Object.assign(configStore, configs);
}
export function clearGlobalDefaults() {
    Object.keys(configStore).forEach(key => {
        delete configStore[key];
    });
}

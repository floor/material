import { setHTML } from "../../dom/html.js";
const DEFAULT_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>`;
export const withTrack = (config) => (component) => {
    const track = document.createElement('span');
    track.className = `${config.prefix}-${config.componentName}__track`;
    const thumb = document.createElement('span');
    thumb.className = `${config.prefix}-${config.componentName}__thumb`;
    track.appendChild(thumb);
    if (config.icon !== 'none') {
        const icon = document.createElement('span');
        icon.className = `${config.prefix}-${config.componentName}__thumb-icon`;
        if (config.controlLabelOnly)
            icon.setAttribute('aria-hidden', 'true');
        setHTML(icon, config.icon || DEFAULT_ICON);
        thumb.appendChild(icon);
    }
    if (config.unselectedIcon) {
        const icon = document.createElement('span');
        icon.className = `${config.prefix}-${config.componentName}__thumb-icon ${config.prefix}-${config.componentName}__thumb-icon--unselected`;
        if (config.controlLabelOnly)
            icon.setAttribute('aria-hidden', 'true');
        setHTML(icon, config.unselectedIcon);
        thumb.appendChild(icon);
        component.element.classList.add(`${config.prefix}-${config.componentName}--icons`);
    }
    component.element.appendChild(track);
    return {
        ...component,
        track,
        thumb
    };
};

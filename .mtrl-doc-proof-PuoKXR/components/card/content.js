import { PREFIX } from "../../core/config.js";
import { pipe } from "../../core/compose/index.js";
import { createBase, withElement } from "../../core/compose/component.js";
import { createElement } from "../../core/dom/create.js";
import { safeUrl } from "../../core/utils/url.js";
import { setHTML } from "../../core/dom/html.js";
export const CARD_CONTENT_PADDING = true;
let headerCount = 0;
export const createCardContent = (config = {}) => {
    const baseConfig = {
        ...config,
        componentName: 'card__content',
        prefix: PREFIX
    };
    try {
        const content = pipe(createBase, withElement({
            tag: 'div',
            componentName: 'card__content',
            className: [
                config.class,
                config.padding === false ? `${PREFIX}-card__content--no-padding` : null
            ].filter(Boolean),
            attributes: {
                'style': 'display: block; color: inherit;'
            }
        }))(baseConfig);
        if (config.html) {
            setHTML(content.element, config.html);
        }
        else if (config.text) {
            const paragraph = document.createElement("p");
            paragraph.textContent = config.text;
            content.element.appendChild(paragraph);
        }
        if (Array.isArray(config.children)) {
            config.children.forEach(child => {
                if (child instanceof HTMLElement) {
                    content.element.appendChild(child);
                }
            });
        }
        return content.element;
    }
    catch (error) {
        console.error('Card content creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create card content: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export const createCardHeader = (config = {}) => {
    const baseConfig = {
        ...config,
        componentName: 'card__header',
        prefix: PREFIX
    };
    try {
        const header = pipe(createBase, withElement({
            tag: 'div',
            componentName: 'card__header',
            className: config.class,
        }))(baseConfig);
        const textContainer = createElement({
            tag: 'div',
            className: `${PREFIX}-card__header-text`,
            container: header.element
        });
        if (config.title) {
            createElement({
                tag: 'h3',
                className: `${PREFIX}-card__header-title`,
                text: config.title,
                container: textContainer,
                attributes: {
                    id: `${header.element.id || `card-header-${++headerCount}`}-title`
                }
            });
        }
        if (config.subtitle) {
            createElement({
                tag: 'p',
                className: `${PREFIX}-card__header-subtitle`,
                text: config.subtitle,
                container: textContainer
            });
        }
        if (config.avatar) {
            const avatarElement = typeof config.avatar === 'string'
                ? createElement({
                    tag: 'div',
                    className: `${PREFIX}-card__header-avatar`,
                    html: config.avatar
                })
                : config.avatar;
            const avatarImg = avatarElement.querySelector('img');
            if (avatarImg && !avatarImg.hasAttribute('alt')) {
                avatarImg.setAttribute('alt', '');
                avatarImg.setAttribute('aria-hidden', 'true');
            }
            header.element.insertBefore(avatarElement, header.element.firstChild);
        }
        if (config.action) {
            const actionElement = typeof config.action === 'string'
                ? createElement({
                    tag: 'div',
                    className: `${PREFIX}-card__header-action`,
                    html: config.action
                })
                : config.action;
            header.element.appendChild(actionElement);
        }
        return header.element;
    }
    catch (error) {
        console.error('Card header creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create card header: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export const createCardActions = (config = {}) => {
    const baseConfig = {
        ...config,
        componentName: 'card__actions',
        prefix: PREFIX
    };
    try {
        const actions = pipe(createBase, withElement({
            tag: 'div',
            componentName: 'card__actions',
            className: [
                config.class,
                config.fullBleed ? `${PREFIX}-card__actions--full-bleed` : null,
                config.vertical ? `${PREFIX}-card__actions--vertical` : null,
                config.align ? `${PREFIX}-card__actions--${config.align}` : null
            ].filter(Boolean),
            attributes: {
                'role': 'group'
            }
        }))(baseConfig);
        if (Array.isArray(config.actions)) {
            config.actions.forEach((action, index) => {
                if (action instanceof HTMLElement) {
                    if (!action.hasAttribute('aria-label') &&
                        !action.hasAttribute('aria-labelledby') &&
                        action.textContent?.trim() === '') {
                        action.setAttribute('aria-label', `Action ${index + 1}`);
                    }
                    actions.element.appendChild(action);
                }
            });
        }
        return actions.element;
    }
    catch (error) {
        console.error('Card actions creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create card actions: ${error instanceof Error ? error.message : String(error)}`);
    }
};
export const NESTED_ACTION_SELECTOR = "button,a[href],input,select,textarea,m-button,m-icon-button,[role=button],[role=link],slot[name=actions],slot[name=header-action]";
export const createCardMedia = (config = {}) => {
    const baseConfig = {
        ...config,
        componentName: 'card__media',
        prefix: PREFIX
    };
    try {
        const media = pipe(createBase, withElement({
            tag: 'div',
            componentName: 'card__media',
            className: [
                config.class,
                config.aspectRatio ? `${PREFIX}-card__media--${config.aspectRatio.replace(':', '-')}` : null,
                config.contain ? `${PREFIX}-card__media--contain` : null
            ].filter(Boolean)
        }))(baseConfig);
        if (config.element instanceof HTMLElement) {
            media.element.appendChild(config.element);
        }
        else if (config.src) {
            const img = document.createElement('img');
            img.src = safeUrl(config.src);
            img.className = `${PREFIX}-card__media-img`;
            img.alt = config.alt || '';
            if (!config.alt) {
                img.setAttribute('aria-hidden', 'true');
            }
            media.element.appendChild(img);
        }
        return media.element;
    }
    catch (error) {
        console.error('Card media creation error:', error instanceof Error ? error.message : String(error));
        throw new Error(`Failed to create card media: ${error instanceof Error ? error.message : String(error)}`);
    }
};

import { omitsAttribute } from "../utils/attributes.js";
import { setAttributes } from "./attributes.js";
import { addClass } from "./classes.js";
import { safeUrl, URL_ATTRIBUTES } from "../utils/url.js";
import { setHTML } from "./html.js";
const EVENT_HANDLER_ATTRIBUTE = /^on[a-z]/i;
const NAMEABLE_TAGS = new Set([
    "button", "fieldset", "form", "iframe", "img", "input",
    "map", "meta", "object", "output", "select", "slot", "textarea",
]);
const RESERVED_OPTIONS = {
    __proto__: null,
    tag: true,
    container: true,
    html: true,
    text: true,
    id: true,
    name: true,
    title: true,
    tabIndex: true,
    style: true,
    role: true,
    ariaLabel: true,
    ariaDescribedBy: true,
    ariaLabelledBy: true,
    ariaHidden: true,
    data: true,
    class: true,
    className: true,
    attributes: true,
    forwardEvents: true,
    onCreate: true,
    context: true,
};
const PASSIVE_TOUCH_EVENTS = new Set(["touchstart", "touchmove"]);
const setupEventForwarding = (element, forwardEvents, context) => {
    if (!forwardEvents || (!context?.emit && !context?.on))
        return;
    element.__eventHandlers = {};
    for (const nativeEvent in forwardEvents) {
        const eventConfig = forwardEvents[nativeEvent];
        const handler = (event) => {
            let shouldForward = true;
            if (typeof eventConfig === "function") {
                try {
                    shouldForward = eventConfig({ ...context, element }, event);
                }
                catch (error) {
                    console.warn(`Error in event condition for ${nativeEvent}:`, error);
                    shouldForward = false;
                }
            }
            else {
                shouldForward = Boolean(eventConfig);
            }
            if (shouldForward && context.emit) {
                context.emit(nativeEvent, { event, element, originalEvent: event });
            }
        };
        element.__eventHandlers[nativeEvent] = handler;
        const options = PASSIVE_TOUCH_EVENTS.has(nativeEvent)
            ? { passive: true }
            : undefined;
        element.addEventListener(nativeEvent, handler, options);
    }
};
export const createElement = (options = {}) => {
    if (!options || Object.keys(options).length === 0) {
        return document.createElement("div");
    }
    if (typeof options === "string") {
        return document.createElement(options);
    }
    const element = document.createElement(options.tag || "div");
    if (options.html)
        setHTML(element, options.html);
    else if (options.text)
        element.textContent = options.text;
    if (options.id)
        element.id = options.id;
    if (options.name && NAMEABLE_TAGS.has(element.tagName.toLowerCase())) {
        element.setAttribute("name", options.name);
    }
    if (options.title)
        element.title = options.title;
    if (options.tabIndex !== undefined)
        element.tabIndex = options.tabIndex;
    if (options.style) {
        Object.assign(element.style, options.style);
    }
    if (options.role)
        element.setAttribute("role", options.role);
    if (options.ariaLabel)
        element.setAttribute("aria-label", options.ariaLabel);
    if (options.ariaDescribedBy)
        element.setAttribute("aria-describedby", options.ariaDescribedBy);
    if (options.ariaLabelledBy)
        element.setAttribute("aria-labelledby", options.ariaLabelledBy);
    if (options.ariaHidden !== undefined)
        element.setAttribute("aria-hidden", String(options.ariaHidden));
    const classSource = options.className || options.class;
    if (classSource)
        addClass(element, classSource);
    if (options.data) {
        Object.assign(element.dataset, options.data);
    }
    if (options.attributes) {
        setAttributes(element, options.attributes);
    }
    for (const key in options) {
        if (!(key in RESERVED_OPTIONS) && !EVENT_HANDLER_ATTRIBUTE.test(key)) {
            const value = options[key];
            if (value != null && !omitsAttribute(key, value)) {
                const text = String(value);
                element.setAttribute(key, URL_ATTRIBUTES.has(key.toLowerCase()) ? safeUrl(text) : text);
            }
        }
    }
    if (options.forwardEvents) {
        setupEventForwarding(element, options.forwardEvents, options.context);
    }
    if (options.container)
        options.container.appendChild(element);
    if (options.onCreate)
        options.onCreate(element, options.context);
    return element;
};
export const createSVGElement = (options = {}) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", options.tag || "svg");
    if (options.text)
        element.textContent = options.text;
    if (options.id)
        element.id = options.id;
    if (options.attributes)
        setAttributes(element, options.attributes);
    if (options.forwardEvents)
        setupEventForwarding(element, options.forwardEvents, options.context);
    if (options.container)
        options.container.appendChild(element);
    if (options.onCreate)
        options.onCreate(element, options.context);
    return element;
};
export const removeEventHandlers = (element) => {
    const handlers = element.__eventHandlers;
    if (handlers) {
        for (const event in handlers) {
            element.removeEventListener(event, handlers[event]);
        }
        delete element.__eventHandlers;
    }
};

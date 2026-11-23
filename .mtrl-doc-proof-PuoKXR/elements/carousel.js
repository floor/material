import createCarousel from "../components/carousel/index.js";
import { createDeclarationClass, defineElement, DEFAULT_PREFIX, } from "./define.js";
const itemValues = new WeakMap();
const itemName = (child) => {
    const label = child.getAttribute("label");
    if (label !== null)
        return label;
    const title = child.getAttribute("title")?.trim();
    if (title)
        return title;
    return (child.textContent ?? "").trim();
};
const declaredNumber = (child, name) => {
    const raw = child.getAttribute(name);
    if (raw === null)
        return undefined;
    const value = Number(raw);
    return Number.isNaN(value) ? undefined : value;
};
const declaredItems = (host) => {
    const itemTag = `${host.localName}-item`;
    const items = [];
    for (const child of Array.from(host.children)) {
        if (child.localName !== itemTag)
            continue;
        const title = itemName(child);
        const loading = child.getAttribute("loading");
        const decoding = child.getAttribute("decoding");
        const slide = {
            image: child.getAttribute("src") ?? undefined,
            alt: child.getAttribute("alt") ?? undefined,
            width: declaredNumber(child, "width"),
            height: declaredNumber(child, "height"),
            loading: loading === "eager" || loading === "lazy" ? loading : undefined,
            decoding: decoding === "sync" || decoding === "async" || decoding === "auto" ? decoding : undefined,
            title: title || undefined,
            description: child.getAttribute("description") ?? undefined,
            buttonText: child.getAttribute("button-text") ?? undefined,
            buttonUrl: child.getAttribute("button-url") ?? undefined,
        };
        items.push({ value: child.getAttribute("value") ?? (title || String(items.length)), slide });
    }
    return items;
};
const readCarousel = (host) => ({ slides: declaredItems(host) });
const create = (config) => {
    const items = config.slides ?? [];
    const component = createCarousel({ ...config, slides: items.map((item) => item.slide) });
    itemValues.set(component, items.map((item) => item.value));
    return component;
};
const sameSlide = (a, b) => !!a && Object.keys(b).every((key) => a[key] === b[key]);
const updateCarousel = (host, component) => {
    const declared = declaredItems(host);
    const wanted = declared.map((item) => item.value);
    if (new Set(wanted).size !== wanted.length)
        return false;
    const values = itemValues.get(component) ?? [];
    if (new Set(values).size !== values.length)
        return false;
    for (let i = values.length - 1; i >= 0; i--) {
        if (!wanted.includes(values[i])) {
            component.removeSlide(i);
            values.splice(i, 1);
        }
    }
    declared.forEach(({ value, slide }, i) => {
        if (values[i] === value) {
            if (!sameSlide(component.slides.getSlide(i), slide))
                component.slides.updateSlide(i, slide);
            return;
        }
        const from = values.indexOf(value);
        if (from !== -1) {
            component.removeSlide(from);
            values.splice(from, 1);
        }
        component.addSlide(slide, i);
        values.splice(i, 0, value);
    });
    itemValues.set(component, values);
    return true;
};
const carouselSpec = {
    name: "carousel",
    ssr: false,
    create: (config) => create(config),
    styles: ["carousel"],
    hostStyles: ":host{display:block}",
    attributes: {
        wheel: { type: "boolean", config: "wheel", update: (c, v) => void c.setWheel(!!v) },
        variant: { type: "string", config: "variant" },
        index: { type: "number", config: "initialSlide", update: (c, v) => void c.goTo(Number(v ?? 0)) },
        "item-width": { type: "number", config: "itemWidth" },
        gap: { type: "number", config: "gap" },
        padding: { type: "number", config: "padding" },
        "corner-radius": { type: "number", config: "cornerRadius" },
        "min-small-item-width": { type: "number", config: "minSmallItemWidth" },
        "max-small-item-width": { type: "number", config: "maxSmallItemWidth" },
        "aria-label": {
            type: "string",
            config: "ariaLabel",
            update: (c, v) => c.element.setAttribute("aria-label", v === null ? "Carousel" : String(v)),
        },
    },
    properties: {
        index: {
            get: (c) => c.getCurrentSlide(),
            set: (c, v) => void c.goTo(Number(v ?? 0)),
            config: "initialSlide",
        },
    },
    model: "index",
    methods: ["next", "prev", "goTo"],
    events: {
        change: {
            detail: (payload) => ({ value: payload.value }),
        },
    },
    config: readCarousel,
    observeChildren: updateCarousel,
};
export const carouselElement = defineElement(carouselSpec);
export const carouselItemDeclaration = {
    name: "carousel-item",
    attributes: {
        value: { type: "string" },
        src: { type: "string" },
        alt: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        loading: { type: "string" },
        decoding: { type: "string" },
        label: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        "button-text": { type: "string" },
        "button-url": { type: "string" },
    },
};
export const defineCarousel = (options) => {
    const itemTag = `${options?.prefix ?? DEFAULT_PREFIX}-${carouselItemDeclaration.name}`;
    if (!customElements.get(itemTag))
        customElements.define(itemTag, createDeclarationClass(carouselItemDeclaration.attributes));
    return carouselElement.define(options);
};

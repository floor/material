import { safeUrl } from "../../../core/utils/url.js";
import { setHTML } from "../../../core/dom/html.js";
export const withSlides = (config) => (component) => {
    const prefix = component.getClass("carousel");
    const scroller = document.createElement("div");
    scroller.className = `${prefix}__scroller`;
    const track = document.createElement("div");
    track.className = `${prefix}__track`;
    scroller.appendChild(track);
    component.element.appendChild(scroller);
    const slideData = [];
    const slideElements = [];
    const enhanced = component;
    let slidesChanged;
    const relabel = () => {
        const total = slideElements.length;
        slideElements.forEach((el, i) => {
            const slide = slideData[i];
            el.dataset.index = String(i);
            el.setAttribute("aria-label", slide.title?.trim() || slide.alt?.trim() || `${i + 1} of ${total}`);
            const img = el.querySelector(`.${prefix}__image`);
            if (img && !slide.loading)
                img.setAttribute("loading", i === 0 ? "eager" : "lazy");
        });
    };
    const fill = (el, slide, index) => {
        el.replaceChildren();
        if (slide.content !== undefined) {
            if (typeof slide.content === "string")
                setHTML(el, slide.content);
            else
                el.appendChild(slide.content);
            return;
        }
        if (slide.image) {
            const img = document.createElement("img");
            img.className = `${prefix}__image`;
            img.src = safeUrl(slide.image);
            img.alt = slide.alt ?? slide.title ?? "";
            img.draggable = false;
            img.setAttribute("loading", slide.loading ?? (index === 0 ? "eager" : "lazy"));
            if (slide.decoding)
                img.setAttribute("decoding", slide.decoding);
            if (slide.width !== undefined)
                img.width = slide.width;
            if (slide.height !== undefined)
                img.height = slide.height;
            el.appendChild(img);
        }
        if (slide.title || slide.description || slide.buttonText) {
            const content = document.createElement("div");
            content.className = `${prefix}__content`;
            if (slide.title) {
                const title = document.createElement("div");
                title.className = `${prefix}__title`;
                title.textContent = slide.title;
                content.appendChild(title);
            }
            if (slide.description) {
                const description = document.createElement("div");
                description.className = `${prefix}__description`;
                description.textContent = slide.description;
                content.appendChild(description);
            }
            if (slide.buttonText) {
                const button = document.createElement("a");
                button.className = `${prefix}__button`;
                button.textContent = slide.buttonText;
                if (slide.buttonUrl)
                    button.href = safeUrl(slide.buttonUrl);
                content.appendChild(button);
            }
            el.appendChild(content);
        }
    };
    const createSlideElement = (slide, index) => {
        const el = document.createElement("div");
        el.className = `${prefix}__item`;
        el.setAttribute("role", "group");
        el.setAttribute("aria-roledescription", "slide");
        el.tabIndex = 0;
        fill(el, slide, index);
        return el;
    };
    const changed = () => {
        relabel();
        slidesChanged?.();
    };
    const slides = {
        addSlide(slide, index) {
            const at = index !== undefined && index >= 0 && index <= slideData.length ? index : slideData.length;
            const el = createSlideElement(slide, at);
            slideData.splice(at, 0, slide);
            if (at < slideElements.length) {
                track.insertBefore(el, slideElements[at]);
                slideElements.splice(at, 0, el);
            }
            else {
                track.appendChild(el);
                slideElements.push(el);
            }
            changed();
            return slides;
        },
        removeSlide(index) {
            if (index < 0 || index >= slideElements.length)
                return slides;
            track.removeChild(slideElements[index]);
            slideElements.splice(index, 1);
            slideData.splice(index, 1);
            changed();
            return slides;
        },
        updateSlide(index, slide) {
            if (index < 0 || index >= slideElements.length)
                return slides;
            slideData[index] = slide;
            fill(slideElements[index], slide, index);
            relabel();
            return slides;
        },
        getSlide: (index) => slideData[index] ?? null,
        getCount: () => slideData.length,
        getElements: () => slideElements.slice(),
    };
    enhanced.scroller = scroller;
    enhanced.track = track;
    enhanced.slides = slides;
    enhanced.slideElements = slideElements;
    enhanced.onSlidesChanged = (handler) => {
        slidesChanged = handler;
    };
    (config.slides ?? []).forEach((slide, i) => {
        const el = createSlideElement(slide, i);
        slideData.push(slide);
        slideElements.push(el);
        track.appendChild(el);
    });
    relabel();
    return enhanced;
};

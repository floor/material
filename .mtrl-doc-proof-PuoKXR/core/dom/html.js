let policy = null;
export const configureHTML = (next) => {
    policy = next;
};
export const getHTMLPolicy = () => policy;
export const setHTML = (element, html) => {
    if (html === null || html === undefined || html === "") {
        element.replaceChildren();
        return;
    }
    const markup = typeof html === "string" && policy ? policy.sanitize(html) : html;
    element.innerHTML = markup;
};

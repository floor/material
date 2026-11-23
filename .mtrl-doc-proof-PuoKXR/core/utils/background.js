export const getInheritedBackground = (element, maxDepth = 17) => {
    if (!element || !(element instanceof HTMLElement)) {
        return { color: '', element: null };
    }
    let depth = 0;
    let currentElement = element;
    while (currentElement && depth < maxDepth) {
        const computedStyle = window.getComputedStyle(currentElement);
        let bgColor = computedStyle.backgroundColor;
        if (bgColor.startsWith('var(')) {
            const varMatch = bgColor.match(/var\((--[\w-]+)\)/);
            if (varMatch) {
                const varName = varMatch[1];
                bgColor = window.getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || 'transparent';
            }
        }
        if (bgColor &&
            bgColor !== 'transparent' &&
            bgColor !== 'rgba(0, 0, 0, 0)' &&
            bgColor !== 'rgba(0,0,0,0)') {
            return { color: bgColor, element: currentElement };
        }
        currentElement = currentElement.parentElement;
        depth++;
    }
    const documentBG = window.getComputedStyle(document.body).backgroundColor;
    if (documentBG !== 'transparent' && documentBG !== 'rgba(0, 0, 0, 0)') {
        return { color: documentBG, element: document.body };
    }
    return { color: 'rgb(255, 255, 255)', element: null };
};
export default getInheritedBackground;

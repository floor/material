export const LIST_DEFAULTS = {
    COLLECTION: 'items',
    BASE_URL: 'http://localhost:4000/api',
    PAGE_SIZE: 20,
    RENDER_BUFFER_SIZE: 5,
    ITEM_HEIGHT: 56
};
export const LIST_VARIANTS = {
    STANDARD: 'standard',
    SEGMENTED: 'segmented'
};
export const LIST_TYPES = {
    DEFAULT: 'default',
    SINGLE_SELECT: 'single-select',
    MULTI_SELECT: 'multi-select'
};
export const LIST_SELECTION_MODES = {
    NONE: 'none',
    SINGLE: 'single',
    MULTIPLE: 'multiple'
};
export const LIST_EVENTS = {
    SELECT: 'select',
    LOAD: 'load',
    SCROLL: 'scroll'
};
export const LIST_SCROLL_POSITIONS = {
    START: 'start',
    CENTER: 'center',
    END: 'end'
};
export const LIST_CLASSES = {
    CONTAINER: 'list',
    LIST: 'list',
    ITEM: 'list__item',
    SELECTED: 'list__item--selected',
    LOADING: 'list--loading',
    EMPTY: 'list--empty'
};

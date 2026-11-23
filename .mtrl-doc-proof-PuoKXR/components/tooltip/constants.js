export const TOOLTIP_POSITIONS = {
    TOP: 'top',
    RIGHT: 'right',
    BOTTOM: 'bottom',
    LEFT: 'left',
    TOP_START: 'top-start',
    TOP_END: 'top-end',
    RIGHT_START: 'right-start',
    RIGHT_END: 'right-end',
    BOTTOM_START: 'bottom-start',
    BOTTOM_END: 'bottom-end',
    LEFT_START: 'left-start',
    LEFT_END: 'left-end'
};
export const TOOLTIP_VARIANTS = {
    DEFAULT: 'default',
    RICH: 'rich',
    PLAIN: 'plain'
};
export const TOOLTIP_EVENTS = {
    SHOW: 'show',
    HIDE: 'hide',
    ENTER: 'enter',
    LEAVE: 'leave'
};
export const TOOLTIP_DEFAULTS = {
    POSITION: TOOLTIP_POSITIONS.BOTTOM,
    VARIANT: TOOLTIP_VARIANTS.DEFAULT,
    VISIBLE: false,
    SHOW_DELAY: 300,
    HIDE_DELAY: 100,
    OFFSET: 8,
    ARROW_SIZE: 8,
    SHOW_ON_FOCUS: true,
    SHOW_ON_HOVER: true
};
export const TOOLTIP_CLASSES = {
    ROOT: 'tooltip',
    CONTAINER: 'tooltip__container',
    ARROW: 'tooltip__arrow',
    CONTENT: 'tooltip__content',
    VISIBLE: 'tooltip--visible',
    HIDDEN: 'tooltip--hidden',
    DEFAULT: 'tooltip--default',
    RICH: 'tooltip--rich',
    PLAIN: 'tooltip--plain',
    POSITION_PREFIX: 'tooltip--'
};

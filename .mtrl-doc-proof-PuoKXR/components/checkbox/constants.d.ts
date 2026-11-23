/** Label position options for the checkbox Controls whether the label appears before or after the checkbox. */
export declare const CHECKBOX_LABEL_POSITION: {
    /** Label appears before (to the left of) the checkbox */
    readonly START: "start";
    /** Label appears after (to the right of) the checkbox (default) */
    readonly END: "end";
};
/** Checkbox state classes These classes are applied to the checkbox element to reflect its current state. */
export declare const CHECKBOX_STATES: {
    /** Applied when the checkbox is checked */
    readonly CHECKED: "checked";
    /** Applied when the checkbox is in indeterminate state */
    readonly INDETERMINATE: "indeterminate";
    /** Applied when the checkbox is disabled */
    readonly DISABLED: "disabled";
    /** Applied when the checkbox has focus */
    readonly FOCUSED: "focused";
};
/** Checkbox element classes These classes are applied to different parts of the checkbox component. */
export declare const CHECKBOX_CLASSES: {
    /** The main checkbox container element */
    readonly ROOT: "checkbox";
    /** The actual input element (usually hidden) */
    readonly INPUT: "checkbox__input";
    /** The visual checkbox icon */
    readonly ICON: "checkbox__icon";
    /** The text label associated with the checkbox */
    readonly LABEL: "checkbox__label";
};

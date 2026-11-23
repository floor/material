import { SNACKBAR_POSITIONS } from "./constants.js";
const isPosition = (value) => Object.values(SNACKBAR_POSITIONS).includes(value);
export const withPosition = (config) => (component) => {
    const prefix = config.prefix || 'mtrl';
    let position = isPosition(config.position) ? config.position : SNACKBAR_POSITIONS.CENTER;
    const className = (value) => `${prefix}-snackbar--${value}`;
    component.element.classList.add(className(position));
    return {
        ...component,
        position: {
            getPosition: () => position,
            setPosition: (next) => {
                const value = isPosition(next) ? next : SNACKBAR_POSITIONS.CENTER;
                if (!isPosition(next)) {
                    console.warn(`Invalid position: ${next}. Using default: ${SNACKBAR_POSITIONS.CENTER}`);
                }
                component.element.classList.remove(className(position));
                position = value;
                component.element.classList.add(className(position));
                return component;
            }
        }
    };
};

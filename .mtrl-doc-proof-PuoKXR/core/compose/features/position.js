export var POSITIONS;
(function (POSITIONS) {
    POSITIONS["LEFT"] = "left";
    POSITIONS["RIGHT"] = "right";
    POSITIONS["TOP"] = "top";
    POSITIONS["BOTTOM"] = "bottom";
    POSITIONS["START"] = "start";
    POSITIONS["END"] = "end";
    POSITIONS["CENTER"] = "center";
})(POSITIONS || (POSITIONS = {}));
export const withPosition = (config) => (component) => {
    if (!config.position || !component.element) {
        return component;
    }
    const position = POSITIONS[config.position.toUpperCase()] ||
        config.position;
    const className = `${config.prefix}-${config.componentName}--${position}`;
    component.element.classList.add(className);
    const positionManager = {
        setPosition(newPosition) {
            const oldPosition = position;
            const oldClassName = `${config.prefix}-${config.componentName}--${oldPosition}`;
            const newClassName = `${config.prefix}-${config.componentName}--${newPosition}`;
            component.element.classList.remove(oldClassName);
            component.element.classList.add(newClassName);
            return this;
        },
        getPosition() {
            return position;
        }
    };
    return {
        ...component,
        position: positionManager
    };
};

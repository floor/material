// src/core/compose/features/position.ts

import { BaseComponent, ElementComponent } from '../component';

/**
 * Available position values
 */
export enum POSITIONS {
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
  START = 'start',
  END = 'end',
  CENTER = 'center'
}

/**
 * Configuration for position feature
 */
export interface PositionConfig {
  position?: string;
  prefix?: string;
  componentName?: string;
}

/**
 * Position manager interface
 */
export interface PositionManager {
  /**
   * Sets the component's position
   * @param newPosition - New position value
   * @returns Position manager for chaining
   */
  setPosition: (newPosition: string) => PositionManager;
  
  /**
   * Gets the current position
   * @returns Current position
   */
  getPosition: () => string;
}

/**
 * Component with position capabilities
 */
export interface PositionComponent extends BaseComponent {
  position: PositionManager;
}

/**
 * Adds positioning functionality to a component
 * 
 * @param config - Configuration object containing position information
 * @returns Function that enhances a component with position capabilities
 */
// `& object` lets a component config that shares no key with PositionConfig through.
export const withPosition = <T extends PositionConfig & object>(config: T) => 
  <C extends ElementComponent>(component: C): C & PositionComponent => {
    if (!config.position || !component.element) {
      return component as C & PositionComponent;
    }

    // A position given as an enum key in any case is the enum's value.
    const normalize = (value: string): string =>
      POSITIONS[value.toUpperCase() as keyof typeof POSITIONS] || value;
    const classFor = (value: string): string =>
      `${config.prefix}-${config.componentName}--${value}`;

    // The position the element carries now: setPosition replaces it, so the
    // class it removes is the last one set, not the first.
    let position = normalize(config.position);
    component.element.classList.add(classFor(position));

    const positionManager: PositionManager = {
      setPosition(newPosition: string) {
        component.element.classList.remove(classFor(position));
        position = normalize(newPosition);
        component.element.classList.add(classFor(position));

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
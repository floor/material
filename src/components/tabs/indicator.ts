// src/components/tabs/indicator.ts
import { TabComponent } from './types';

/**
 * Configuration for tab indicator
 */
export interface TabIndicatorConfig {
  /** Height of the indicator in pixels */
  height?: number;
  /** Width strategy - fixed size or dynamic based on tab width */
  widthStrategy?: 'fixed' | 'dynamic' | 'content' | 'auto';
  /** Fixed width in pixels when using fixed strategy */
  fixedWidth?: number;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Animation timing function */
  animationTiming?: string;
  /** Whether to show the indicator */
  visible?: boolean;
  /** CSS class prefix */
  prefix?: string;
  /** Custom color for the indicator */
  color?: string;
  /** Tabs variant (primary or secondary) */
  variant?: string;
}

/**
 * Tab indicator API
 */
export interface TabIndicator {
  /** The indicator DOM element */
  element: HTMLElement;
  /** Move the indicator to a specific tab */
  moveToTab: (tab: TabComponent, immediate?: boolean) => void;
  /** Show the indicator */
  show: () => void;
  /** Hide the indicator */
  hide: () => void;
  /** Set indicator color */
  setColor: (color: string) => void;
  /** Update indicator position (e.g. after resize) */
  update: () => void;
  /** Destroy the indicator and clean up */
  destroy: () => void;
}

/**
 * Default configuration for tab indicator
 */
const DEFAULT_CONFIG: TabIndicatorConfig = {
  widthStrategy: 'auto', // Changed to 'auto' to match variant behavior
  fixedWidth: 40,
  visible: true,
  prefix: 'mtrl',
  variant: 'primary',
};

// m3.material.io tabs specs: the primary indicator is 3dp and "inset 2dp on each
// side" of its content, at least 24dp long; the secondary one is 2dp (Compose's
// SecondaryIndicator takes the primary 3dp; the site wins). FLO-262.
const PRIMARY_HEIGHT = 3;
const SECONDARY_HEIGHT = 2;
const PRIMARY_INSET = 2;
const MIN_LENGTH = 24;

/**
 * Creates a tab indicator component
 * @param config - Indicator configuration
 * @returns Tab indicator instance
 */
export const createTabIndicator = (config: TabIndicatorConfig = {}): TabIndicator => {
  // Merge with default config
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const prefix = mergedConfig.prefix || 'mtrl';
  
  // Create indicator element
  const element = document.createElement('div');
  element.className = `${prefix}-tabs__indicator`;
  // The stylesheet moves the indicator on the default spatial spring. An app that
  // passes a duration or an easing gets that instead.
  const custom = mergedConfig.animationDuration !== undefined || mergedConfig.animationTiming !== undefined;
  const motion = (property: string): string =>
    `${property} ${mergedConfig.animationDuration ?? 250}ms ${mergedConfig.animationTiming ?? 'cubic-bezier(0.4, 0, 0.2, 1)'}`;
  const transition = custom ? `${motion('transform')}, ${motion('width')}` : '';
  element.style.transition = transition;
  element.style.width = `${mergedConfig.fixedWidth}px`; // Set initial width
  element.style.height = `${mergedConfig.height ?? (mergedConfig.variant === 'secondary' ? SECONDARY_HEIGHT : PRIMARY_HEIGHT)}px`;
  
  // Set initial visibility
  if (!mergedConfig.visible) {
    element.style.opacity = '0';
  }
  
  // Track current tab to be able to update on resize
  let currentTab: TabComponent | null = null;
  
  /**
   * Calculates indicator width based on strategy and variant
   * @param tab - Target tab
   * @returns Width in pixels
   */
  const calculateWidth = (tab: TabComponent): number => {
    // Use auto strategy to determine based on variant
    if (mergedConfig.widthStrategy === 'auto') {
      // For secondary tabs, use full tab width
      if (mergedConfig.variant === 'secondary') {
        return tab.element.offsetWidth;
      }
      
      // For primary tabs (default), use text label width
      const textElement = tab.element.querySelector(`.${prefix}-button__text`);
      
      if (textElement) {
        return Math.max(textElement.getBoundingClientRect().width - 2 * PRIMARY_INSET, MIN_LENGTH);
      }
      
      // Fallback to dynamic if text element not found
      return Math.max(tab.element.offsetWidth / 2, 30);
    }
    
    // Handle other strategies when explicitly set
    switch (mergedConfig.widthStrategy) {
      case 'dynamic':
        return Math.max(tab.element.offsetWidth / 2, 30);
      case 'content':
        // Try to match content width
        const text = tab.element.querySelector(`.${prefix}-button__text`);
        if (text) {
          return Math.max(text.clientWidth, 30);
        }
        return mergedConfig.fixedWidth || 40;
      case 'fixed':
      default:
        return mergedConfig.fixedWidth || 40;
    }
  };
  
  /**
   * Gets the direct DOM position for a tab element
   * @param tabElement - The tab element
   * @returns {Object} Position information
   */
  const getTabPosition = (tabElement: HTMLElement): { left: number, width: number } => {
    // Find the scroll container (should be the parent of the tab)
    const scrollContainer = tabElement.parentElement;
    if (!scrollContainer) {
      console.error('Tab has no parent element, cannot position indicator');
      return { left: 0, width: tabElement.offsetWidth };
    }
    
    // Get positions using getBoundingClientRect for most accurate values
    const tabRect = tabElement.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    
    // Calculate position relative to scroll container
    return {
      left: tabRect.left - containerRect.left,
      width: tabRect.width
    };
  };
  
  /**
   * Calculates indicator position based on variant and width
   * @param tab - Target tab
   * @param indicatorWidth - Width of the indicator
   * @returns {Object} Position information
   */
  const calculatePosition = (tab: TabComponent, indicatorWidth: number): { left: number } => {
    const { left, width: tabWidth } = getTabPosition(tab.element);
    
    // For primary tabs with text label width, center under the text
    if (mergedConfig.variant !== 'secondary' && 
        (mergedConfig.widthStrategy === 'auto' || mergedConfig.widthStrategy === 'content')) {
      const textElement = tab.element.querySelector(`.${prefix}-button__text`);
      
      if (textElement) {
        // Get text element position relative to tab
        const textRect = textElement.getBoundingClientRect();
        const tabRect = tab.element.getBoundingClientRect();
        const textLeft = textRect.left - tabRect.left;
        
        // Centred under the text: the 2dp inset on each side, or a short label's
        // 24dp minimum overhanging it evenly.
        return {
          left: left + textLeft + (textRect.width - indicatorWidth) / 2
        };
      }
    }
    
    // For secondary tabs or when no text element found
    // For centered indicators, center in the tab
    if (indicatorWidth < tabWidth) {
      return {
        left: left + ((tabWidth - indicatorWidth) / 2)
      };
    }
    
    // For full-width indicators
    return { left };
  };
  
  /**
   * Moves indicator to specified tab
   * @param tab - Target tab
   * @param immediate - Whether to skip animation
   */
  const moveToTab = (tab: TabComponent, immediate: boolean = false): void => {
    if (!tab || !tab.element) {
      console.error('Invalid tab or tab has no element');
      return;
    }
    
    // Store current tab for later updates
    currentTab = tab;
    
    // Calculate indicator width based on strategy and variant
    const width = calculateWidth(tab);
    
    // Calculate position based on width and variant
    const { left } = calculatePosition(tab, width);
    
    // Apply position immediately if requested
    if (immediate) {
      element.style.transition = 'none';
      
      // Force reflow to ensure transition is skipped
      element.offsetHeight; // eslint-disable-line no-unused-expressions
    }
    
    // Update position and width
    element.style.width = `${width}px`;
    element.style.transform = `translateX(${left}px)`;
    
    // Restore transition after immediate update
    if (immediate) {
      // Need to use timeout to ensure browser processes the style change
      setTimeout(() => {
        element.style.transition = transition;
      }, 10);
    }
  };
  
  /**
   * Updates indicator position (e.g. after resize)
   */
  const update = (): void => {
    if (currentTab) {
      moveToTab(currentTab, true);
    }
  };
  
  /**
   * Shows the indicator
   */
  const show = (): void => {
    element.style.opacity = '1';
  };
  
  /**
   * Hides the indicator
   */
  const hide = (): void => {
    element.style.opacity = '0';
  };
  
  /**
   * Sets indicator color
   * @param color - CSS color value
   */
  const setColor = (color: string): void => {
    element.style.backgroundColor = color;
  };
  
  /**
   * Cleans up and destroys the indicator
   */
  const destroy = (): void => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
    currentTab = null;
  };
  
  return {
    element,
    moveToTab,
    show,
    hide,
    setColor,
    update,
    destroy
  };
};
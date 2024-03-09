import EventEmitter from './mixin/emitter'
import build from './module/build'
import display from './mixin/display'
import events from './module/events'
import dataset from './module/dataset'
import ripple from './module/ripple'

const DEFAULT_TYPE = 'button'
const DEFAULT_CLASS = 'button'

// Button class extends EventEmitter for event handling
class Button extends EventEmitter {
  // Static method to identify as a component
  static isComponent () {
    return true
  }

  // Default properties for a button
  static defaults = {
    class: DEFAULT_CLASS, // Default CSS class
    tag: 'button', // HTML tag to use
    styles: ['style', 'color'], // Array of style types
    ripple: true, // Enable ripple effect
    stopPropagation: false, // Event propagation flag
    // Event handling mappings
    events: [
      ['element.click', 'click'],
      ['element.mousedown', 'mousedown'],
      ['element.mouseup', 'mouseup'],
      ['element.mouseleave', 'mouseup'],
      ['element.touchstart', 'mousedown'],
      ['element.touchend', 'mouseup']
    ]
  }

  constructor (options) {
    super()

    this.init(options) // Initialize with options
    this.build() // Build the button
    this.setup() // Setup attributes and events
  }

  // Initialize options by merging with defaults
  init (options) {
    this.options = { ...Button.defaults, ...options }
    Object.assign(this, build, display) // Mixin build and display functionality
  }

  // Set attributes and styles
  setup () {
    this.setAttributes() // Set HTML attributes
    this.styleAttributes() // Apply styles

    // Set innerHTML if text option is provided
    if (this.options.text) {
      this.element.innerHTML = this.element.innerHTML + this.options.text
    }

    events.attach(this.options.events, this) // Attach event listeners
  }

  // Set various HTML attributes based on options
  setAttributes () {
    // Destructuring options for easier access
    const { type, name, value, title, text, label, tooltip, data, case: caseOption } = this.options

    // Setting HTML attributes
    this.element.setAttribute('type', type ?? DEFAULT_TYPE)
    if (name) this.element.setAttribute('name', name)
    if (value) this.element.setAttribute('value', value)
    if (title) this.element.setAttribute('title', title)
    this.element.setAttribute('aria-label', text ?? label ?? DEFAULT_CLASS)
    if (tooltip) this.element.setAttribute('data-tooltip', tooltip)
    if (data) dataset(this.element, data)
    if (caseOption) this.element.classList.add(`${caseOption}-case`)
    if (this.options.ripple) ripple(this.element) // Apply ripple effect if enabled
  }

  // Apply additional styles
  styleAttributes () {
    const { style, size, color, bold } = this.options
    // Add classes for style, size, color, and boldness
    if (style) this.element.classList.add(`style-${style}`)
    if (size) this.element.classList.add(`${size}-size`)
    if (color) this.element.classList.add(`color-${color}`)
    if (bold) this.element.classList.add('bold')
  }

  // Setters for various properties
  set (prop, value) {
    // Switch case to handle different properties
    switch (prop) {
      case 'value':
        this.element.value = value
        break
      // Other cases omitted for brevity
    }

    return this // Chainable method
  }

  // Other methods omitted for brevity

  // Event handling for clicks
  click (ev) {
    if (this.options.stopPropagation === true) {
      ev.stopPropagation()
    }

    this.emit('click', ev) // Emit click event
  }

  // Other methods omitted for brevity
}

export default Button

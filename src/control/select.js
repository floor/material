import emitter from '..//module/emitter'
import attach from '../module/attach'
import attributes from './module/attributes'
import dataset from '../view/dataset'

const defaults = {
  type: 'list', // native
  class: 'select',
  first: null,
  attributes: ['type', 'name', 'autocomplete', 'required']
}

class Select {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, attach, dataset)

    this.build()
    this.attach()

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    var tag = this.options.tag || 'span'
    this.root = document.createElement(tag)
    this.root.classList.add('select')

    if (this.options.class !== 'select') {
      this.root.classList.add(this.options.class)
    }

    this.buildLabel()
    this.buildInput()

    if (this.container) {
      this.container.appendChild(this.root)
    }

    return this
  }

  buildLabel () {
    if (this.options.label) {
      this.label = document.createElement('span')
      this.label.classList.add('label')
      this.label.innerHTML = this.options.label
      this.root.appendChild(this.label)
    }
  }

  buildInput () {
    this.input = document.createElement('select')
    this.input.classList.add('input')
    this.root.appendChild(this.input)

    this.input.addEventListener('change', () => {
      // console.log('change', this.input[this.input.selectedIndex].value)
      this.emit('change', this.input[this.input.selectedIndex].value)
    })

    if (this.options.data) {
      dataset(this.data, this.options.data)
    }

    attributes(this.input, this.options)

    if (this.options.options) {
      this.setOptions(this.options.options)
    }
  }

  setOptions (options) {
    // console.log('buildCountry', this.input)

    var first = this.options.first

    if (first && first[0] && first[1]) {
      this.input.options[0] = new Option(first[1], first[0])
    }

    for (var i = 0; i < options.length; i++) {
      this.addOption(options[i][1], options[i][0])
    }
  }

  addOption (name, value) {
    // console.log('addOption', name, value)
    this.input.options[this.input.options.length] = new Option(name, value)
  }

  set (value) {
    // console.log('set', value)
    this.input.value = value

    return this
  }

  setLabel (value) {
    console.log('setLabel', value)
    if (this.label) {
      this.label.innerHTML = value
    }
  }

  setText (value) {
    this.setLabel(value)
  }

  get () {
    var value = null

    if (this.input[this.input.selectedIndex]) {
      value = this.input[this.input.selectedIndex].value
    }

    return value
  }
}

export default Select

import emitter from '../module/emitter'
import dataset from '../view/dataset'
import attributes from './module/attributes'

const defaults = {
  class: 'file',
  attributes: ['name', 'accept', 'required', 'disabled', 'multiple']
}

class File {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter)

    this.build()
    this.attach()

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.element = document.createElement('div')
    this.element.classList.add('file')

    if (this.options.class !== 'file') {
      this.element.classList.add(this.options.class)
    }

    this.buildLabel()
    this.buildInput()

    if (this.options.data) {
      dataset(this.element, this.options.data)
    }

    if (this.options.focus) {
      this.input.focus()
    }

    if (this.options.container) {
      this.options.container.appendChild(this.element)
    }

    return this
  }

  buildLabel () {
    if (this.options.label) {
      this.label = document.createElement('label')
      this.label.classList.add('label')
      this.label.innerHTML = this.options.label
      this.element.appendChild(this.label)
    }
  }

  buildInput () {
    this.field = document.createElement('div')
    this.field.classList.add('field')
    this.element.appendChild(this.field)

    this.input = document.createElement('input')
    this.input.setAttribute('type', 'file')
    this.element.appendChild(this.input)

    attributes(this.input, this.options)

    this.field.appendChild(this.input)

    if (this.options.focus) {
      this.input.focus()
    }
  }

  attach () {
    this.input.addEventListener('change', (e) => {
      this.emit('change', e)
    })
  }

  image (e) {
    // console.log('image', e.target)
    // if (input.files && input.files[0]) {
    //   var reader = new FileReader()

    //   reader.onload = (e) => {
    //     cover.style.backgroundImage = 'url("' + e.target.result + '")'
    //   }

    //   reader.readAsDataURL(input.files[0])
    // }
  }

  reset () {
    // console.log('reset')
    this.input.value = ''
  }

  set (image) {
    // console.log('set', image)
  }

  setLabel (value) {
    // console.log('setLabel', value)
    if (this.label) {
      this.label.innerHTML = value
    }
  }

  setText (value) {
    this.setLabel(value)
  }
}

export default File

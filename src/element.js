class Element {
  static uid = "material-element";

  static isElement () {
    return true
  }

  constructor (options) {
    this.options = Object.assign({}, options || {})
    // console.log('element options', options)
    const element = document.createElement(this.options.tag || 'div')

    const container = this.options.container
    delete this.options.container
    delete this.options.tag

    if (options.html) element.innerHTML = this.options.html
    delete this.options.html

    if (options.text) element.textContent = this.options.text
    delete this.options.text

    if (options.id) element.setAttribute('id', options.id)

    for (const [property, value] of Object.entries(this.options)) {
      element.setAttribute(property, value)
    }

    if (container) {
      container.appendChild(element)
    }

    return element
  }
}

export default Element

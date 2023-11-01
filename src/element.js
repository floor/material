class Element {
  static isElement () {
    return true
  }

  constructor (options) {
    this.options = Object.assign({}, options || {})
    // console.log('element options', options)
    const element = document.createElement(this.options.tag || 'div')
    delete this.options.tag

    if (options.html) element.innerHTML = this.options.html
    delete this.options.html

    if (options.text) element.textContent = this.options.text
    delete this.options.text

    if (options.id) element.setAttribute('id', options.id)

    for (const property in this.options) {
      if (this.options.hasOwnProperty(property)) {
        element.setAttribute(property, this.options[property])
      }
    }

    if (this.options.container) {
      this.options.container.appendChild(element)
    }

    return element
  }
}

export default Element


const defaults = {
  class: 'image',
  tag: 'div',
  format: 'thumb'
}

/**
 * Class representing an image.
 *
 * @extends Image
 * @return {parent} The class instance
 * @example new Image({
 *   src: {
 *     filename: 'image.png',
 *     url: 'exmaple.com/image/'
 *     format: ['thumbs/', 'medium/', 'large/'],
 *   },
 *   container: document.body
 * });
 */
class Image {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    this.build()

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.element = document.createElement(this.options.tag)
    this.element.classList.add(this.options.class)
    if (this.options.class !== 'image') {
      this.element.classList.add('image')
    }

    if (this.options.container) {
      this.options.container.appendChild(this.element)
    }

    return this
  }

  set (src) {
    // console.log('set', src)
    if (!src) {
      this.element.style.backgroundImage = ''
    } else {
      var url = null

      if (src.format) {
        var format = this.sanitize(src.format)

        if (format.length > 0) {
          var index = format.indexOf(this.options.format)
          if (index === -1) {
            format = src.format[0] + '/'
          } else {
            format = this.options.format + '/'
          }
        }

        url = src.url + format
      } else {
        url = src.url
      }

      this.element.style.backgroundImage = 'url(' + url + src.filename + ')'
    }
  }

  sanitize (formats) {
    var a = []
    for (var i = 0; i < formats.length; i++) {
      var format = formats[i].replace(/\/$/, '')
      a.push(format)
    }
    return a
  }
}

export default Image

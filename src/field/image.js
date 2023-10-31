import build from '../module/build'

class Image {
  static isImage () {
    return true
  }

  static defaults = {
    class: 'image',
    format: 'thumb'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init(options) {
    this.options = { ...Image.defaults, ...options }  
    Object.assign(this, build)
  }

  set (src, asset) {
    asset = asset || {}

    if (!src) return

    var url = src.url

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

      url = url + format
    }

    this.element.style.backgroundImage = 'url(' + asset.url + src.path + 'thumb/' + src.filename + ')'
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

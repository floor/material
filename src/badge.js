import build from './module/build'
import display from './mixin/display'

const isStringNumber = (str) => !isNaN(parseFloat(str)) && isFinite(str)

class Badge {
  static uid = "material-badge";

  static defaults = {
    class: 'badge'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = Object.assign({}, Badge.defaults, options || {})
    Object.assign(this, build, display)
  }

  set (text) {
    this.element.innerHTML = text || ''
  }

  get () {
    return this.element.innerHTML
  }

  inc (value) {
    // console.log('inc', value)
    let actual = this.element.innerHTML

    if (actual === '') actual = '0'

    if (isStringNumber(value) && isStringNumber(actual)) {
      actual = (parseInt(value, 10) + parseInt(actual, 10)).toString()
    }

    this.element.innerHTML = actual
    this.show()
  }
}

export default Badge

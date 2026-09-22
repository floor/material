import Component from './class/component'
import display from './mixin/display'

const isStringNumber = (str) => !isNaN(parseFloat(str)) && isFinite(str)

class Badge extends Component {
  static defaults = {
    class: 'badge',
    mixins: [display]
  }

  set (text) {
    this.element.innerHTML = text || ''
  }

  get () {
    return this.element.innerHTML
  }

  inc (value) {
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

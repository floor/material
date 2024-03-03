import build from './module/build'

class DateHour {
  static uid = "material-datehour";

  static defaults = {
    class: 'date',
    tag: 'span'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = Object.assign({}, DateHour.defaults, options || {})
    Object.assign(this, build)
  }

  set (date) {
    // console.log('set', src)
    const d = new Date(date)
    const formatted = this.format(d)
    this.element.innerHTML = formatted
  }

  format (date) {
    let hours = date.getHours()
    let minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours || 12 // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes
    const strTime = hours + ':' + minutes + ' ' + ampm
    return date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + strTime
  }
}

export default DateHour

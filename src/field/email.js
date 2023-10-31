import build from '../module/build'

class EmailLink {
  static defaults = {
    class: 'email'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init(options) {
    this.options = { ...Button.defaults, ...options }  
    Object.assign(this, build)
  }

  set (email) {
    this.element.innerHTML = email
    this.element.setAttribute('href', 'mailto:' + email)
  }
}

export default EmailLink

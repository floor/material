import build from './module/build'

class AppBar {
  static uid = "material-appbar";

  static defaults = {
    class: 'appbar'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = Object.assign({}, AppBar.defaults, options || {})
    Object.assign(this, build)
  }
}

export default AppBar

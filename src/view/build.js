import scrollbar from '../module/scrollbar'
import dataset from './dataset'
import Layout from '../layout'

export default {
  build () {
    this.root = document.createElement('div')
    this.root.classList.add('view')

    if (this.options.class) {
      this.addClass(this.options.class)
    }

    if (this.options.data) {
      dataset(this.root, this.options.data)
    }

    this.container = this.options.container || document.body
    this.container.appendChild(this.root)

    if (this.options.layout) {
      this.layout = new Layout(this.options.layout, this.root)
      this.ui = this.layout.component
    }
  },

  addClass (c) {
    var list = c.split(' ')

    for (var i = 0; i < list.length; i++) {
      this.root.classList.add(list[i])
    }
  }
}

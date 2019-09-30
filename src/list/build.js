import Layout from 'material/src/layout'
import Virtual from '../../module/virtual'
import observer from '../../module/observer'

export default {
  build (data) {
    // console.log('options', this.options.layout)

    this.root = document.createElement('div')
    this.root.classList.add('list-view')
    this.root.classList.add(this.options.class)

    this.layout = new Layout(this.options.layout.main, this.root)
    this.ui = this.layout.component

    observer.insert(this.root, () => {
      this.buildVirtual()
    })
  },

  buildVirtual () {
    var height = 80

    if (this.options.item && this.options.item.height) {
      height = this.options.item.height
    }

    this.virtual = new Virtual({
      container: this.ui.body,
      itemHeight: height,
      render: (i) => {
        return this.renderItem(this.data[i])
      }
    })
  }
}

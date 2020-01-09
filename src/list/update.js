import Layout from '../layout'

export default {
  update (info) {
    // console.log('update', info)

    this.info = info

    var item = this.ui.body.querySelector('[data-id="' + info._id + '"]')

    // console.log('item', item)

    item.innerHTML = ''

    var layout = new Layout(this.options.layout.item, item)

    this.renderInfo(layout, info)

    return item
  }
}

import Element from '../element'
import Layout from '../layout'

import dot from '../module/dot'

export default {

  render (list, option) {
    // console.log('render', list)
    this.virtual.set(list)

    if (this.status && this.options.count !== true) {
      this.status('count', list.length)
    }
  },

  /**
   * [add description]
   * @param {[type]} info    [description]
   * @param {[type]} context [description]
   */
  renderItem (info, context) {
    // console.log('renderItem', info)
    info = info || {}

    var id = this.options.dataId || '_id'

    var container = this.ui.body

    if (context === 'create') {
      container.scrolltop = 0
    }

    // if (context === 'search') {
    //   container = this.ui['search-list']
    // }

    var element = new Element({
      tag: 'li',
      class: 'item'
    })

    // console.log('---', this.id)

    if (this.id && this.id === info[id]) {
      element.classList.add('selected')
    }

    element.dataset.id = info[id]
    element.dataset.info = this.options.info

    var layout = null

    if (this.options.itemSwitch) {
      var item = info[this.options.itemSwitch]

      if (this.options.layout.item[item]) {
        layout = new Layout(this.options.layout.item[item], element)
      } else {
        layout = new Layout(this.options.layout.item.base, element)
      }
    } else {
      var itemName = this.options.itemName || 'item'
      layout = new Layout(this.options.layout[itemName], element)
    }

    this.renderInfo(layout, info)

    if (context === 'top' || context === 'create') {
      container.insertBefore(element, container.firstChild)
      this.selectCreated(info, element)
    } else {
      container.appendChild(element)
    }

    this.emit('infoRendered', info, element)

    return element
  },

  /**
   * [renderInfo description]
   * @param  {[type]} layout [description]
   * @param  {[type]} info   [description]
   * @return {[type]}        [description]
   */
  renderInfo (layout, object) {
    // console.log('renderInfo', object)
    var info = dot(object)

    var f = this.extractInfo(layout.component)

    for (var field in f) {
      if (f.hasOwnProperty(field)) {
        if (f[field] && f[field].set) {
          f[field].set(this.objectValueByDotKey(object, field))
        } else {
          // console.log('innerHTML', typeof f[field])
          f[field].innerHTML = info[field]
        }
      }
    }
  },

  objectValueByDotKey (object, dotkey) {
    var keys = dotkey.split(/\./)

    var value = Object.assign({}, object)

    for (var i = 0; i < keys.length; i++) {
      if (value !== undefined) {
        value = value[keys[i]]
      }
    }

    return value
  },

  extractInfo (object) {
    // console.log('extractField', object)

    var field = {}

    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        var infos = property.split(/\./)

        if (infos[0] === 'info' && infos[1] !== undefined) {
          var name = property.substr(5, property.length)
          // console.log('field', name, property)

          field[name] = object[property]
        }
      }
    }

    return field
  }
}

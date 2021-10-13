import dataset from '../view/dataset'

import Layout from '../layout'
import Virtual from '../module/virtual'

export default {
  build (data) {
    // console.log('options', this.options.layout)

    this.root = document.createElement('div')
    this.root.classList.add('list')

    if (this.options.class) {
      this.addClass(this.options.class)
    }

    this.root.addEventListener('click', (e) => {
      e.stopPropagation()
    })

    if (this.options.name) {
      this.name = this.options.name
    }

    if (this.options.data) {
      dataset(this.root, this.options.data)
    }

    this.layout = new Layout(this.options.layout.main, this.root)
    this.ui = this.layout.component

    if (this.options.container) {
      this.options.container.appendChild(this.root)

      this.buildVirtual()
    } else {
      this.buildVirtual()
    }
  },

  addClass (c) {
    var list = c.split(' ')

    for (var i = 0; i < list.length; i++) {
      this.root.classList.add(list[i])
    }
  },

  buildVirtual () {
    // console.log('buildVirtual', this.options.class)
    var height = 80
    this.size = this.options.list.size
    this.stop = false

    if (this.options.item && this.options.item.height) {
      height = this.options.item.height
    }

    this.virtual = new Virtual({
      container: this.ui.body,
      itemHeight: height,
      size: this.size,
      render: (i) => {
        // console.log('render', this.data[i])
        return this.renderItem(this.data[i])
      }
    })

    if (this.options.loading === 'dynamic') {
      // console.log('dynamic')
      this.virtual.on('next', (total) => {
        // console.log('next', total)
        if (this.stop) return

        // console.log('next', total, this.page, this.size)
        this.page = this.page || 1
        // console.log('slide', total, this.options.list.size)
        // var page = Math.ceil(total / this.size) + 1

        this.page++

        if (this.mode === 'search') {
          this.search(this.ui['search-input'].input.value, this.page, this.size, true)
        } else {
          this.fetch(this.page, this.size, true)
        }
      }).on('progress', (progress) => {
        // console.log('progress', progress, this.count)
        //
        //
        if (this.statusDisplay) {
          var percent = parseInt(progress / this.count * 100)
          this.statusDisplay('count', percent + '% | ' + progress + ' / ' + this.count)
        }
      })
    }

    window.addEventListener('resize', () => {
      this.coord = this.ui.body.getBoundingClientRect()
      // this.virtual.update()
    })
  }
}

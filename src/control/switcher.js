import emitter from 'material/src/module/emitter'

const defaults = {
  class: 'switcher',
  tag: 'div',
  mode: 'unique'
}

class Switcher {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter)

    this.build()
    this.attach()

    return this
  }

  build () {
    this.root = document.createElement(this.options.tag)
    this.root.classList.add(this.options.class)

    this.label = document.createElement('label')
    this.label.innerHTML = this.options.label
    this.root.appendChild(this.label)

    this.buildList()

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }
  }

  buildList () {
    this.list = document.createElement('ul')
    this.root.appendChild(this.list)

    for (var i = 0; i < this.options.list.length; i++) {
      var item = document.createElement('li')
      item.classList.add('item')
      item.dataset.switcher = this.options.list[i]
      item.innerHTML = this.options.list[i]
      this.list.appendChild(item)
    }
  }

  attach () {
    this.root.addEventListener('click', (event) => {
      if (!event.target.dataset.switcher) return
      this.select(event.target)
    })
  }

  select (option) {
    if (this.options.mode === 'multiple') {
      this.multiple(option)
    } else {
      this.unique(option)
    }
  }

  unique (option) {
    if (!option.classList.contains('selected')) {
      var options = this.list.childNodes

      for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('selected')
      }

      option.classList.add('selected')
      this.selected = [option.dataset.switcher]
      this.emit('change', this.selected)
    }
  }

  multiple (option) {
    if (option.classList.contains('selected')) {
      if (this.selected.length === 1) return
      var i = this.selected.indexOf(option.dataset.switcher)
      this.selected.splice(i, 1)
      option.classList.remove('selected')
    } else {
      option.classList.add('selected')
      this.selected.push(option.dataset.switcher)
    }

    this.emit('change', this.selected)
  }

  set (arr) {
    arr = arr || []
    var list = this.options.list
    this.selected = []
    for (var i = 0; i < list.length; i++) {
      this.root.querySelector('[data-switcher="' + list[i] + '"]').classList.remove('selected')
      if (arr.indexOf(list[i]) !== -1) {
        this.selected.push(list[i])
        this.root.querySelector('[data-switcher="' + list[i] + '"]').classList.add('selected')
      }
    }
  }

  get () {
    console.log('get', this.selected)
    return this.selected
  }
}

export default Switcher

import emitter from '../module/emitter'

const defaults = {
  class: 'switcher',
  tag: 'div',
  first: false,
  mode: 'unique',
  allowEmpty: false
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

    if (this.options.class !== 'button') {
      this.root.setAttribute('class', 'switcher ' + this.options.class)
    } else {
      this.root.classList.add('switcher')
    }

    if (this.options.label) {
      this.label = document.createElement('label')
      this.label.innerHTML = this.options.label
      this.root.appendChild(this.label)
    }

    this.knob = document.createElement('span')
    this.knob.classList.add('knob')
    this.root.appendChild(this.knob)

    if (this.options.size) {
      this.root.classList.add(this.options.size + '-size')
    }

    this.buildList(this.options.list)

    if (this.options.list) {
      this.setOptions(this.options.list)
    }

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }
  }

  buildList (list) {
    this.list = document.createElement('ul')
    this.root.appendChild(this.list)
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

  preselect (item) {
    // console.log('preselect', item)
    if (item) {
      item.classList.add('preselected')
    } else {
      var items = this.list.childNodes
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('preselected')
      }
    }
  }

  selectByName (name) {
    // console.log('selectByName', name)
    var item = this.root.querySelector('[data-switcher="' + name + '"]')
    // console.log('item', item)
    if (item) {
      this.select(item)
    }
  }

  preSelectByName (name) {
    // console.log('selectByName', name)
    var item = this.root.querySelector('[data-switcher="' + name + '"]')
    // console.log('item', item)
    this.preselect(item)
  }

  unique (option) {
    // console.log('option', option)
    if (!option.classList.contains('selected')) {
      var options = this.list.childNodes

      for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('selected')
      }

      option.classList.add('selected')
      this.selected = [option.dataset.switcher]
      this.emit('change', this.selected)
    } else {
      if (this.options.allowEmpty) {
        option.classList.remove('selected')
        this.selected = []
        this.emit('change', this.selected)
      }
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

  setOptions (list) {
    // console.log('setOptions', list)

    if (!list) return

    for (var i = 0; i < list.length; i++) {
      var item = document.createElement('li')
      item.classList.add('item')
      item.dataset.switcher = list[i]
      item.innerHTML = list[i]
      this.list.appendChild(item)
    }
  }

  setLabel (value) {
    // console.log('setLabel', value)
    if (this.label) {
      this.label.innerHTML = value
    }
  }

  setText (value) {
    // console.log('setText', value)
    this.setLabel(value)
  }

  get () {
    // console.log('get', this.selected)
    return this.selected
  }
}

export default Switcher

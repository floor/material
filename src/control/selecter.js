import emitter from '..//module/emitter'
import attach from '../module/attach'
import dataset from '../view/dataset'
import attributes from './module/attributes'
import addClass from './module/addclass'

// ui
import Layout from '../layout'
import Element from '../element'
import Button from './button'

const defaults = {
  class: 'selecter',
  first: null,
  attributes: ['type', 'name', 'autocomplete', 'required'],
  layout: [
    [Element, 'label', { tag: 'label', class: 'label' }],
    [Element, 'value', { tag: 'value', class: 'value' }],
    [Element, 'input', { tag: 'input', type: 'text', class: 'input' }],
    [Element, 'list', { class: 'list' },
      [Element, 'head', { class: 'head' },
        [Element, 'title', { class: 'title' }],
        [Button, 'close', { class: 'close' }]
      ],
      [Element, 'body', { class: 'body' }]
    ]
  ],
  events: [
    ['ui.value.click', 'showList'],
    ['ui.list.click', 'select'],
    ['ui.close.click', 'hideList']
  ]
}

class Selecter {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, attach, dataset)

    this.build()
    this.setup()
    this.attach()

    return this
  }

  setup () {
    if (this.options.data) {
      dataset(this.root, this.options.data)
    }

    // console.log('attribute', this.ui.input, this.options)
    attributes(this.ui.input, this.options)

    if (this.value) {
      this.element.input.setAttribute('checked', 'checked')
    }

    if (this.options.tooltip) {
      this.root.setAttribute('data-tooltip', this.options.tooltip)
    }

    if (this.options.label) {
      this.setLabel(this.options.label)
    }

    this.ui.input.setAttribute('aria-label', this.options.name)

    if (this.options.case) {
      this.root.classList.add(this.options.case + '-case')
    }
  }
  /**
   * build method
   * @return {Object} The class instance
   */
  build () {
    var tag = this.options.tag || 'span'
    this.root = document.createElement(tag)
    this.root.classList.add('selecter')

    if (this.options.class !== 'selecter') {
      addClass(this.root, this.options.class)
    }

    this.layout = new Layout(this.options.layout, this.root)
    this.ui = this.layout.component

    // console.log('ui', this.ui)

    this.styleAttributes()

    this.buildIcon(this.options.icon)
    this.setList(this.options.list)

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }
  }

  buildIcon (icon) {
    if (!icon) return

    this.ui.icon = document.createElement('i')
    this.ui.icon.classList.add('icon')
    this.ui.icon.innerHTML = this.options.icon

    this.root.insertBefore(this.ui.icon, this.ui.input)
  }

  buildInput () {
    this.input = document.createElement('select')
    this.input.classList.add('input')
    this.root.appendChild(this.input)

    this.input.addEventListener('change', () => {
      // console.log('change', this.input[this.input.selectedIndex].value)
      this.emit('change', this.input[this.input.selectedIndex].value)
    })

    if (this.options.data) {
      dataset(this.data, this.options.data)
    }

    attributes(this.input, this.options)
  }

  setList (list) {
    // console.log('setList', list)
    if (!list) return

    this.values = {}

    // console.log('list', list)

    for (var i = 0; i < list.length; i++) {
      // if (list.indexOf(list[i][0]) > -1) {
      var item = document.createElement('div')
      item.classList.add('item')
      item.innerHTML = list[i][1]
      item.dataset.value = list[i][0]

      this.values[list[i][0]] = list[i][1]

      this.ui.body.appendChild(item)
      // }
    }
  }

  styleAttributes () {
    if (this.options.style) {
      this.root.classList.add('style-' + this.options.style)
    }

    if (this.options.size) {
      this.root.classList.add(this.options.size + '-size')
    }

    if (this.options.color) {
      this.root.classList.add('color-' + this.options.color)
    }

    if (this.options.bold) {
      this.root.classList.add('bold')
    }
  }
  showList () {
    // console.log('showList')

    this.ui.list.classList.add('show')
  }

  hideList () {
    // console.log('hideList')

    this.ui.list.classList.remove('show')
  }

  select (e) {
    // console.log('select', e.target)

    e.preventDefault()

    if (e && e.target && e.target.dataset.value) {
      if (this.selected) {
        this.selected.classList.remove('selected')
      }
      this.selected = e.target
      this.selected.classList.add('selected')

      this.value = e.target.dataset.value
      // console.log('value', e.target.dataset.value)
      this.ui.value.innerHTML = this.values[this.value]
      this.emit('change', this.value)
    }

    if (this.options.type !== 'listonly') {
      this.hideList()
    }
  }

  addOption (name, value) {
    this.input.options[this.input.options.length] = new Option(name, value)
  }

  set (value) {
    // console.log('set', value, this.values)

    this.ui.input.value = value
    if (this.values) {
      this.ui.value.innerHTML = this.values[value]
    }

    this.selected = this.root.querySelector('[data-value=' + value + ']')

    // console.log('item', this.selected)
    if (this.selected) {
      this.selected.classList.add('selected')
    }

    return this
  }

  setLabel (value) {
    // console.log('setLabel', value)
    if (this.ui.label) {
      this.ui.label.innerHTML = value
      this.ui.title.innerHTML = value
    }
  }

  setText (value) {
    this.setLabel(value)
  }

  get () {
    return this.value
  }
}

export default Selecter

'use strict'

import create from './mixin/create'
import insert from './element/insert'
import event from './element/event'
import offset from './element/offset'
import emitter from './module/emitter'

const defaults = {
  prefix: 'material',
  class: 'banner',
  tag: 'div'
}

/**
 * Class representing a UI Container. Can add components.
 *
 * @extends Component
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class Banner {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    // init and build
    this.init(options)
    this.build()
    this.attach()

    return this
  }

  /**
   * Init class
   * @params {Object} options The instance options
   * @return {Object} This class instance
   */
  init (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter)

    return this
  }

  /**
   * [build description]
   * @return {Object} This class  instance
   */
  build () {
    this.element = create(this.options)

    if (this.options.container) {
      insert(this.element, this.options.container)
    }

    return this
  }

  attach () {
    event.add(this.element, 'click', (ev) => {
      // console.log('click', ev.target)

      if (ev.target && ev.target.classList.contains('material-button')) {
        var name = ev.target.getAttribute('data-name')
        // console.log('name', name)
        this.emit('select', name)
        this.dismiss(ev.target)
      }

      ev.stopPropagation()
    })

    this.element.addEventListener('DOMNodeInserted', (e) => {
      // console.log('DOMNodeInserted', e.target)
      var textNode = e.target

      if (textNode == this.element) {
        // console.log('banner root inserted', e.target)
        if (!this.wrapper) { this.wrap() }
        this.scroll(this.view)
      }
      this.updatePaddingView()

      // if (textNode !== this.element) return
    })
  }

  dismiss () {
    this.wrapper.classList.add('is-closed')
    this.wrapper.style.height = '0'
    this.updatePaddingView()
  }

  show () {
    console.log('this.height', this.height)
    this.wrapper.classList.remove('is-closed')
    this.wrapper.style.height = this.height + 'px'
    this.updatePaddingView()
    this.updatePosition()
  }

  wrap () {
    this.view = this.element.parentNode

    // console.log('wrap', this.element, this.view)
    this.wrapper = document.createElement('div')

    this.wrapper.classList.add('banner-wrapper')

    this.view.insertBefore(this.wrapper, this.element)

    this.wrapper.appendChild(this.element)

    // insert(this.wrapper, this.element, 'before')

    // insert(this.element, this.wrapper)
  }

  updatePaddingView () {
    // console.log('updatePaddingView', this.view)

    this.height = offset(this.element, 'height')
    if (!this.paddingview) {
      this.paddingview = window.getComputedStyle(this.view)['padding-top']
    }

      // this.element.style.top = 'top: ' + this.paddingview

        // console.log('paddingTop', padding)
        // if (!padding) padding = window.getComputedStyle(this.element.parentNode, 'padding')
        // console.log('padding', padding)

    var padding = parseInt(this.paddingview, 10)
    var size = parseInt(this.height, 10)

    this.padding = padding

      // console.log(' banner inserted in', size, 'padding', padding)
      //
      //

    var ptop = this.ptop = padding

    if (this.wrapper.classList.contains('is-fixed') && !this.wrapper.classList.contains('is-closed')) {
      var ptop = this.ptop = size + padding
    }

    this.view.setAttribute('style', 'padding-top: ' + ptop + 'px')
  }

  scroll (view) {
    // console.log('initScroll', offset(this.element, 'top'), offset(view, 'top'))

    var isBody = false

    var element = view

    this.scrolling = view

    if (view === document.body) {
      isBody = true
      element = document
      this.scrolling = document.body
    }

    // view.classList.add()

    element.addEventListener('scroll', (e) => {
      // console.log('scroll', this.view)
      this.updatePosition()
    })
  }

  updatePosition () {
    var view = this.view
    var scrollTop
    if (view === document.body) {
      scrollTop = (document.documentElement ||
       document.body.parentNode ||
       document.body).scrollTop
    } else {
      scrollTop = view.scrollTop
    }

      // var o = offset(this.element, 'top') - offset(view, 'top')
      // console.log('o', this.element.offsetTop)

    var padding = this.paddingview
    padding = parseInt(padding, 10)

    // console.log('scroll', scrollTop, padding)

    if (scrollTop > padding) {
      var y = scrollTop - padding
      // console.log('fixed', y)
      this.wrapper.classList.add('is-fixed')
      this.wrapper.style.transform = 'translateY(' + y + 'px)'

      // this.update(scrollTop, padding)
      // this.wrapper.setAttribute('style', 'top: ' + this.paddingview)
      this.wrapper.style.top = this.paddingview
    } else {
      // console.log('relative')
      this.wrapper.classList.remove('is-fixed')
      this.wrapper.style.transform = 'translateY(' + 0 + 'px)'
      this.wrapper.style.top = '0'
      // this.wrapper.setAttribute('style', 'top: ' + this.paddingview)
      // this.wrapper.setAttribute('style', 'top: 0')
    }

    this.updatePaddingView()
  }

  update (scrollTop, padding) {

  }

  insert (container, context) {
    insert(this.element, container, context)

    return this
  }
}

export default Banner

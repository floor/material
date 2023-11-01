(() => {
  // ../../node_modules/material/src/module/css.js
  function has (element, className) {
    if (!element || !className) {
      return false
    }
    return !!element.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
  }
  function add (element, className) {
    if (!element || !className) {
      return
    }
    const classNames = className.split(' ')
    for (let i = 0; i < classNames.length; i++) {
      const cn = classNames[i]
      if (!has(element, cn)) {
        element.classList.add(cn)
      }
    }
    return element
  }
  function remove (element, className) {
    if (!element || !className) {
      return
    }
    element.classList.remove(className)
    return element
  }
  function toggle (element, className) {
    if (has(element, className)) {
      remove(element, className)
    } else {
      add(element, className)
    }
    return element
  }
  const css_default = { has, add, remove, toggle }

  // ../../node_modules/material/src/component/classify.js
  function classify (element, options) {
    css_default.add(element, options.prefix + '-' + options.class)
    if (options.name) {
      css_default.add(element, options.class + '-' + options.name)
    }
    if (options.type) {
      css_default.add(element, 'type-' + options.type)
    }
    if (options.color) {
      css_default.add(element, options.color + '-color')
    }
    if (options.css) {
      css_default.add(element, options.css)
    }
    if (options.elevation) {
      css_default.add(element, 'elevation-z' + options.elevation)
    }
    if (options.name) {
      element.dataset.name = options.name
    }
    if (options.label) {
      element.title = options.label
    }
    if (options.style) {
      const styles = options.style.split(' ')
      for (let i = 0; i < styles.length; i++) {
        css_default.add(element, 'style-' + styles[i])
      }
    }
    if (options.theme) {
      element.classList.add(options.theme + '-theme')
    }
  }
  const classify_default = classify

  // ../../node_modules/material/src/component/create.js
  function create (options) {
    const element = document.createElement(options.tag || 'div')
    classify_default(element, options)
    return element
  }
  const create_default = create

  // ../../node_modules/material/src/element/create.js
  function create2 (tag, className) {
    tag = tag || 'div'
    const element = document.createElement(tag)
    css_default.add(element, className)
    return element
  }
  const create_default2 = create2

  // ../../node_modules/material/src/module/dom.js
  function append (container, element) {
    container.appendChild(element)
    return element
  }
  function prepend (container, element) {
    return container.insertBefore(element, container.firstChild)
  }
  function after (container, element) {
    return container.parentNode.insertBefore(element, container.nextSibling)
  }
  function before (container, element) {
    return container.insertBefore(element, container)
  }
  function replace (container, element) {
    return container.parentNode.replaceChild(element, container)
  }
  function remove2 (element) {
    const parent = element.parentNode
    return parent.removeChild(element)
  }
  function dispose (element) {
    const el = element
    return el.parentNode ? el.parentNode.removeChild(el) : el
  }
  function empty (element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
  }
  function destroy (element) {
    return element.parentNode.removeChild(element)
  }
  const dom_default = { append, prepend, after, before, replace, remove: remove2, destroy, empty, dispose }

  // ../../node_modules/material/src/element/insert.js
  function insert (element, container, context) {
    if (!element || !container) { return }
    element = element.root || element
    container = container.root || container
    context = context || 'bottom'
    const contexts = ['top', 'bottom', 'after', 'before']
    const methods = ['prepend', 'append', 'after', 'before']
    const index = contexts.indexOf(context)
    if (index === -1) {
      return
    }
    const method = methods[index]
    dom_default[method](container, element)
    return element
  }
  const insert_default = insert

  // ../../node_modules/material/src/component/control.js
  const KEYCODE = {
    ENTER: 13,
    SPACE: 32
  }
  const control = {
    toggle () {
      if (this.disabled) { return }
      this.focus()
      if (this.checked) {
        this.check(false)
      } else {
        this.check(true)
      }
      return this
    },
    check (checked) {
      if (checked) {
        css_default.add(this.root, 'is-checked')
        this.element.input.checked = true
        this.checked = true
        this.emit('change', this.checked)
      } else {
        css_default.remove(this.root, 'is-checked')
        this.element.input.checked = false
        this.checked = false
        this.emit('change', this.checked)
      }
      return this
    },
    label (label2, container) {
      if (!label2) { return }
      this.element = this.element || {}
      if (!this.element.label) {
        this.element.label = create_default2('label', this.options.class + '-label')
      }
      this.element.label.textContent = label2
      container = container || this.root
      insert_default(this.element.label, container)
    },
    icon (icon, container, position) {
      if (!icon) { return }
      container = container || this.root
      position = position || 'top'
      if (this.options.type === 'text-icon') {
        position = 'bottom'
      }
      this.element = this.element || {}
      this.element.icon = create_default2('i', this.options.class + '-icon')
      insert_default(this.element.icon, container, position)
      this.element.icon.innerHTML = icon
    },
    error (error) {
      error = error || this.options.error
      if (this.options.error === null) { return }
      const text = this.options.error || this.options.text
      if (!this.element.error) {
        this.element.error = create_default2('error', this.options.class + '-error')
      }
      if (text) {
        this.element.error.textContent = text
      }
      insert_default(this.element.error, this.root, 'bottom')
    },
    disable () {
      this.disabled = true
      this.element.input.setAttribute('disabled', 'disabled')
      css_default.add(this.root, 'is-disabled')
      return this
    },
    enable () {
      this.disabled = false
      this.element.input.removeAttribute('disabled')
      css_default.remove(this.root, 'is-disabled')
      return this
    },
    keydown (e2) {
      if (e2.altKey) { return }
      switch (e2.keyCode) {
        case KEYCODE.ENTER:
        case KEYCODE.SPACE:
          e2.preventDefault()
          this.toggle(e2)
          break
        default:
          break
      }
    },
    get (prop) {
      switch (prop) {
        case 'name':
          this.getName()
          break
        default:
          this.setValue(prop)
      }
      return this
    },
    getName () {
      return this.root.dataset.name
    },
    focus () {
      if (this.disabled === true) { return this }
      css_default.add(this.root, 'is-focused')
      if (this.element.input !== document.activeElement) {
        this.element.input.focus()
      }
      return this
    },
    blur () {
      css_default.remove(this.root, 'is-focused')
      return this
    }
  }
  const control_default = control

  // ../../node_modules/material/src/module/utils.js
  function _isArray (object) {
    return Object.prototype.toString.call(object) === '[object Array]'
  }
  function _isLiteralObject (object) {
    return object && typeof object === 'object' && Object.getPrototypeOf(object) === Object.getPrototypeOf({})
  }
  function _isIterable (object) {
    const r = _isLiteralObject(object) || _isArray(object) || typeof object === 'object' && object !== null && object.length !== void 0
    return r
  }
  function _each (object, callback) {
    if (_isArray(object) || typeof object === 'object' && object.length !== void 0) {
      for (let i = 0, l = object.length; i < l; i++) {
        callback.apply(object[i], [object[i], i])
      }
      return
    }
    if (_isLiteralObject(object)) {
      for (const key in object) {
        callback.apply(object[key], [object[key], key])
      }
    }
  }

  // ../../node_modules/material/src/element/style.js
  function get (element, style) {
    if (_isArray(style)) {
      const css = {}
      for (const i in list) {
        css[list[i]] = this.get(element, list[i])
      }
      return css
    } else {
      let computedStyle
      if (typeof window.getComputedStyle === 'function') {
        computedStyle = window.getComputedStyle(element)
      } else if (typeof document.currentStyle !== void 0) {
        computedStyle = element.currentStyle
      } else {
        computedStyle = element.style
      }
      if (style) {
        return computedStyle[style]
      } else {
        return computedStyle
      }
    }
  }
  function set (element, style) {
    if (_isIterable(element) && _isLiteralObject(style)) {
      _each(element, function (e2) {
        set(e2, style)
      })
      return element
    }
    if (_isLiteralObject(style)) {
      for (const i in style) {
        element.style[i] = style[i]
      }
      return style
    }
    return false
  }
  const style_default = { get, set }

  // ../../node_modules/material/src/element/offset.js
  function offset (element, prop) {
    const rect = element.getBoundingClientRect()
    const offset2 = {
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
      width: rect.width ? Math.round(rect.width) : Math.round(element.offsetWidth),
      height: rect.height ? Math.round(rect.height) : Math.round(element.offsetHeight)
    }
    if (offset2.width <= 0) {
      offset2.width = parseFloat(style_default.get(element, 'width'))
    }
    if (offset2.height <= 0) {
      offset2.height = parseFloat(style_default.get(element, 'height'))
    }
    if (prop) {
      return offset2[prop]
    } else {
      return offset2
    }
  }
  const offset_default = offset

  // ../../node_modules/material/src/component/ripple.js
  const defaults = {
    transition: '.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
    opacity: ['1', '.3']
  }
  function init (instance2) {
    instance2.on('built', (container) => {
      set2(container)
    })
  }
  function set2 (container) {
    container.addEventListener('mousedown', (e2) => {
      show(e2)
    })
  }
  function show (e2) {
    const container = e2.target
    const offs = offset_default(container)
    const ripple = create_default2('div', 'material-ripple')
    const end = coordinate(offs)
    const initial = {
      left: (e2.offsetX || offs.width / 2) + 'px',
      top: (e2.offsetY || offs.height / 2) + 'px'
    }
    ripple.style.left = initial.left
    ripple.style.top = initial.top
    ripple.style.transition = defaults.transition
    insert_default(ripple, container, 'top')
    setTimeout(() => {
      ripple.style.left = end.left
      ripple.style.top = end.top
      ripple.style.width = end.size
      ripple.style.height = end.size
    }, 1)
    document.body.onmouseup = () => {
      destroy2(ripple)
    }
  }
  function destroy2 (ripple) {
    if (ripple.parentNode) {
      ripple.style.opacity = '0'
    }
    document.body.onmouseup = null
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 1e3)
  }
  function coordinate (o) {
    const size = o.width
    let top = -o.height / 2
    if (o.width > o.height) {
      top = -(o.width - o.height / 2)
    }
    return {
      size: size * 2 + 'px',
      top: top + 'px',
      left: size / -2 + 'px'
    }
  }
  const ripple_default = init

  // ../../node_modules/material/src/module/emitter.js
  const emitter_default = {
    on (event, cb) {
      this.event = this.event || {}
      this.event[event] = this.event[event] || []
      this.event[event].push(cb)
      return this
    },
    off (event, cb) {
      this.event = this.event || {}
      if (event in this.event === false) { return }
      this.event[event].splice(this.event[event].indexOf(cb), 1)
      return this
    },
    emit (event) {
      this.event = this.event || {}
      if (event in this.event === false) { return }
      for (let i = 0; i < this.event[event].length; i++) {
        this.event[event][i].apply(this, Array.prototype.slice.call(arguments, 1))
      }
      return this
    }
  }

  // ../../node_modules/material/src/module/extract.js
  function f (instance2, func) {
    if (!func) { return }
    if (typeof func === 'function') {
      return func
    } else if (!func.match(/\./)) { return instance2[func] }
    let iteration
    const keys = func.split('.')
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      iteration = iteration || instance2
      iteration = iteration[key]
    }
    return iteration
  }
  function e (instance2, ev) {
    if (!ev) { return instance2 } else if (!ev.match(/\./)) { return instance2[ev] }
    let iteration
    const obj = {}
    let element
    const keys = ev.split('.')
    for (let i = 0, l = keys.length; i < l; i++) {
      const key = keys[i]
      iteration = iteration || instance2
      iteration = iteration[key]
      if (i === keys.length - 2) {
        element = iteration
      }
    }
    obj.element = element
    obj.name = keys[keys.length - 1]
    return obj
  }
  const extract_default = { e, f }

  // ../../node_modules/material/src/module/attach.js
  const attach_default = {
    attach: function (events) {
      events = events || this.options.events
      if (!events) { return }
      const instance2 = this
      events.map((def) => {
        const e2 = extract_default.e(instance2, def[0])
        const f2 = extract_default.f(instance2, def[1])
        e2.element.addEventListener(e2.name, f2.bind(this))
      })
      return this
    }
  }

  // ../../node_modules/material/src/Button.js
  const defaults2 = {
    prefix: 'material',
    class: 'button',
    tag: 'button',
    events: [
      ['root.click', 'handleClick']
    ]
  }
  const Button = class {
    constructor (options) {
      this.init(options)
      this.build()
      this.setup()
      this.attach()
      this.emit('ready')
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults2, options || {})
      Object.assign(this, control_default, emitter_default, attach_default, ripple_default)
      this.element = this.element || {}
      ripple_default(this)
      this.emit('init')
    }

    build () {
      this.element = {}
      this.root = create_default(this.options)
      this.options.label = this.options.label || this.options.text
      this.root.setAttribute('aria-label', this.options.label || this.options.name)
      this.label(this.options.label)
      this.icon(this.options.icon)
      if (this.options.container) {
        insert_default(this.root, this.options.container)
      }
      this.emit('built', this.root)
      return this
    }

    insert (container, context) {
      insert_default(this.root, container, context)
      return this
    }

    setup () {
      this.element.input = this.root
      if (this.options.name) {
        this.root.dataset.name = this.options.name
      }
      if (this.options.content) {
        this.root.innerHTML = this.options.content
      }
    }

    set (prop, value) {
      switch (prop) {
        case 'disabled':
          this.disable(value)
          break
        case 'value':
          this.setValue(value)
          break
        case 'label':
          this.setLabel(value)
          break
        default:
          this.setValue(prop)
      }
      return this
    }

    handleClick (e2) {
      e2.preventDefault()
      if (this.disabled === true) { return }
      if (this.options.upload) { return }
      this.emit('click', e2)
      return this
    }
  }
  const Button_default = Button

  // ../../node_modules/material/src/component/insert.js
  const insert_default2 = {
    insert (container, context) {
      const element = this.root
      this.insertElement(element, container, context)
      return this
    },
    insertElement (element, container, context) {
      if (container && container.root) {
        container = container.root
      }
      this.container = container
      context = context || 'bottom'
      const contexts = ['top', 'bottom', 'after', 'before']
      const methods = ['prepend', 'append', 'after', 'before']
      const index = contexts.indexOf(context)
      if (index === -1) {
        return
      }
      const method = methods[index]
      dom_default[method](container, element)
      return element
    }
  }

  // ../../node_modules/material/src/module/object.js
  function is (object) {
    return object && typeof object === 'object' && Object.getPrototypeOf(object) === Object.getPrototypeOf({})
  }

  // ../../node_modules/material/src/layout.js
  const Layout = class {
    constructor (schema, container) {
      this.component = this.create(schema, container)
      return this
    }

    create (schema, container, structure, level) {
      level = level || 0
      level++
      structure = structure || {}
      let component = null
      for (var i = 0; i < schema.length; i++) {
        var name
        let options = {}
        if (schema[i] instanceof Object && typeof schema[i] === 'function') {
          if (is(schema[i + 2])) {
            options = schema[i + 2]
          }
          if (typeof schema[i + 1] === 'string') {
            name = schema[i + 1]
            options.name = name
          }
          component = new schema[i](options)
          if (name) {
            structure[name] = component
          }
          if (component) {
            this.display(component.root, options)
            this.style(component, options)
          }
          if (level === 1) {
            const isClass = (fn) => /^\sclass/.test(schema[i].toString())
            structure.root = component.root
          }
          if (component && container) {
            if (component.insert) { component.insert(container) } else { insert_default(component, container) }
          }
        } else if (Array.isArray(schema[i])) {
          if (component == null) {
            component = container
          }
          this.create(schema[i], component, structure, level)
        }
      }
      return structure
    }

    display (element, options) {
      const display = options.display
      const direction = options.direction || 'horizontal'
      if (!element || !display) { return }
      if (direction === 'horizontal') {
        element.className += ' flex-row'
      } else if (direction === 'vertical') {
        element.className += ' flex-column'
      }
    }

    style (component) {
      const options = component.options || {}
      if (options.flex) {
        css_default.add(component.root, 'flex-' + options.flex)
      } else {
        const size = options.size
        if (options.size && options.width) {
          component.root.width = size + 'px'
        } else if (options.size && options.height) {
          component.root.height = size + 'px'
        }
      }
      if (options.position) {
        component.root.position = options.position
      }
      if (options.bottom) {
        component.root.bottom = options.bottom
      }
      if (options.hide) {
        component.root.display = 'none'
      }
      if (options.theme) {
        css_default.add(component.root, 'theme-' + options.theme)
      }
    }

    get (name) {
      if (name) { return this.component[name] } else { return this.component }
    }
  }
  const layout_default = Layout

  // ../../node_modules/material/src/card.js
  const defaults3 = {
    prefix: 'material',
    class: 'card',
    tag: 'div'
  }
  const Card = class {
    constructor (options) {
      this.init(options)
      this.build()
    }

    init (options) {
      this.options = Object.assign({}, defaults3, options || {})
      Object.assign(this, insert_default2)
    }

    build () {
      this.root = create_default(this.options)
      if (this.options.layout) {
        this.layout = new layout_default(this.options.layout, this.root)
      }
    }
  }
  const card_default = Card

  // ../../node_modules/material/src/component/events.js
  const events_default = {
    addEvent (event, fn) {
      const element = this.root
      function listenHandler (e2) {
        const ret = fn.apply(this, arguments)
        if (ret === false) {
          e2.stopPropagation()
          e2.preventDefault()
        }
        return ret
      }
      function attachHandler () {
        const ret = fn.call(element, window.event)
        if (ret === false) {
          window.event.returnValue = false
          window.event.cancelBubble = true
        }
        return ret
      }
      if (element.addEventListener) {
        element.addEventListener(event, listenHandler, false)
      } else {
        element.attachEvent('on' + event, attachHandler)
      }
      return this
    },
    removeEvent (event, fn) {
      const element = this.root
      if (element.removeEventListener) {
        element.removeEventListener(event, fn, false)
      } else if (element.detachEvent) {
        element.detachEvent('on' + event, element[fn.toString() + event])
        element[fn.toString() + event] = null
      } else {
        element['on' + event] = function () {
        }
      }
      return this
    }
  }

  // ../../node_modules/material/src/component.js
  const defaults4 = {
    prefix: 'material',
    class: 'component',
    tag: 'span'
  }
  const Component = class {
    constructor (options) {
      this.init(options)
      this.build()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults4, options || {})
      Object.assign(this, emitter_default, events_default, insert_default2)
      return this
    }

    build () {
      this.root = create_default(this.options)
      if (this.options.container) {
        this.insert(this.options.container)
      }
      return this
    }
  }
  const component_default = Component

  // ../../node_modules/material/src/container.js
  const defaults5 = {
    prefix: 'material',
    class: 'container',
    tag: 'div'
  }
  const Container = class {
    constructor (options) {
      this.init(options)
      this.build()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults5, options || {})
      Object.assign(this, emitter_default)
      return this
    }

    build () {
      this.root = create_default(this.options)
      if (this.options.container) {
        insert_default(this.root, this.options.container)
      }
      return this
    }

    insert (container, context) {
      insert_default(this.root, container, context)
      return this
    }
  }
  const container_default = Container

  // ../../node_modules/material/src/component/label.js
  function label (root, text, options) {
    text = text || null
    const prefix = options.class || options.prefix
    const label2 = create_default2('label', prefix + '-label')
    label2.textContent = text
    label2.setAttribute('for', options.name)
    insert_default(label2, root)
    return label2
  }
  const label_default = label

  // ../../node_modules/material/src/element/attribute.js
  function init2 (element, attribute) {
    for (const key in attribute) {
      if (attribute.hasOwnProperty(key)) {
        element.setAttribute(key, attribute[key])
      }
    }
    return element
  }
  function set3 (element, name, value) {
    return element.setAttribute(name, '' + value)
  }
  function get2 (element, name) {
    return element.getAttribute(name) || null
  }
  function remove3 (element, name) {
    return element.removeAttribute(name)
  }
  const attribute_default = { init: init2, set: set3, get: get2, remove: remove3 }

  // ../../node_modules/material/src/element/build.js
  function isObject (object) {
    return object && typeof object === 'object' && Object.getPrototypeOf(object) === Object.getPrototypeOf({})
  }
  function process (string) {
    const tags = string.match(/^[\w-]+/)
    const ids = string.match(/#([\w-]+)/)
    const classes = string.match(/\.[\w-]+/g)
    const names = string.match(/\$([\w-]+)/)
    const properties = {
      tag: tags ? tags[0] : 'div'
    }
    if (ids) { properties.id = ids[1] }
    if (names) { properties.name = names[1] }
    if (classes) {
      properties.class = classes.join(' ').replace(/\./g, '')
    }
    return properties
  }
  function build (schema, container, object, level) {
    let element
    object = object || {}
    for (let i = 0; i < schema.length; i++) {
      if (typeof schema[i] === 'string') {
        const property = process(schema[i])
        element = create_default2(property.tag, property.class)
        insert_default(element, container)
        if (property.name) {
          object[property.name] = element
        }
      } else if (isObject(schema[i])) {
        attribute_default.init(element, schema[i])
      } else if (Array.isArray(schema[i])) {
        build(schema[i], element, object, level)
      }
    }
    return object
  }
  const build_default = build

  // ../../node_modules/material/src/skin/material/icon/checkbox.svg
  const checkbox_default = 'export default `\n<svg width="18px" height="18px" class="checkbox-icon" viewBox="0 0 18 18">\n  <polygon class="checkbox-check" points="7 14.42 2 9.42 3.41 8.01 7 11.59 14.59 4 16 5.42"></polygon>\n</svg>`;'

  // ../../node_modules/material/src/checkbox.js
  const defaults6 = {
    prefix: 'material',
    class: 'checkbox',
    type: 'control',
    build: [
      '$root.material-checkbox',
      {},
      ['input$input', {}],
      ['span$control.checkbox-control']
    ],
    events: [
      ['element.control.click', 'click', {}],
      ['element.label.click', 'toggle', {}],
      ['element.input.focus', 'focus'],
      ['element.input.blur', 'blur'],
      ['element.input.keydown', 'keydown', {}]
    ]
  }
  const Checkbox = class {
    constructor (options) {
      this.init(options)
      this.build()
      this.attach()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults6, options || {})
      Object.assign(this, events_default, control_default, emitter_default, attach_default)
      return this
    }

    build () {
      this.element = build_default(this.options.build)
      this.root = this.element.root
      this.element.control.innerHTML = checkbox_default
      const text = this.options.text || this.options.label
      this.element.label = label_default(this.root, text, this.options)
      this.element.input.setAttribute('type', 'checkbox')
      this.element.input.setAttribute('name', this.options.name)
      this.element.input.setAttribute('aria-label', this.options.name)
      if (this.options.value) {
        this.element.input.setAttribute('value', this.options.value)
      }
      if (this.options.disabled) {
        this.disabled = this.options.disabled
        this.element.input.setAttribute('disabled', 'disabled')
        css_default.add(this.root, 'is-disabled')
      }
      if (this.options.checked) {
        this.check(true)
      }
      if (this.options.value) {
        this.set('value', this.value)
      }
      if (this.options.container) {
        insert_default(this.root, this.options.container)
      }
      return this
    }

    set (prop, value) {
      switch (prop) {
        case 'checked':
          this.check(value)
          break
        case 'value':
          this.setValue(value)
          break
        case 'label':
          this.setLabel(value)
          break
        default:
          this.check(prop)
      }
      return this
    }

    insert (container, context) {
      insert_default(this.root, container, context)
      return this
    }

    click (e2) {
      this.toggle(e2)
      this.element.input.focus()
      return this
    }

    setValue (value) {
      console.log('setValue', value)
      this.value = value
      this.element.input.setAttribute('value', value)
      return this
    }
  }
  const checkbox_default2 = Checkbox

  // ../../node_modules/material/src/component/controller.js
  let instance = null
  const Controller = class {
    constructor () {
      if (!instance) {
        instance = this
      }
      this.components = this.components || []
      this.component = this.component || {}
      this.init()
      return instance
    }

    init () {
      this.subscribe('settings', (message) => {
      })
    }

    register (component) {
      this.components.push(component)
      this.component[component.name] = this.component[component.name] || []
      this.component[component.name].push(component)
      return this
    }

    subscribe (topic, callback) {
      this._topics = this._topics || {}
      if (!this._topics.hasOwnProperty(topic)) {
        this._topics[topic] = []
      }
      this._topics[topic].push(callback)
      return true
    }

    unsunscribe (topic, callback) {
      this._topics = this._topics || {}
      if (!this._topics.hasOwnProperty(topic)) {
        return false
      }
      for (let i = 0, len = this._topics[topic].length; i < len; i++) {
        if (this._topics[topic][i] === callback) {
          this._topics[topic].splice(i, 1)
          return true
        }
      }
      return false
    }

    publish () {
      this._topics = this._topics || {}
      const args = Array.prototype.slice.call(arguments)
      const topic = args.shift()
      if (!this._topics.hasOwnProperty(topic)) {
        return false
      }
      for (let i = 0, len = this._topics[topic].length; i < len; i++) {
        this._topics[topic][i].apply(void 0, args)
      }
      return true
    }
  }
  const controller = new Controller()
  const controller_default = controller

  // ../../node_modules/material/src/divider.js
  const defaults7 = {
    prefix: 'material',
    class: 'divider',
    tag: 'span'
  }
  const Divider = class {
    constructor (options) {
      this.init(options)
      this.build()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults7, options || {})
      Object.assign(this, insert_default2)
    }

    build () {
      this.root = create_default(this.options)
      if (this.options.text) {
        this.root.textContent = this.options.text
      }
      if (this.options.container) {
        this.insert(this.options.container)
      }
    }
  }
  const divider_default = Divider

  // ../../node_modules/material/src/component/init.js
  function init3 (instance2) {
    modules(instance2)
    controller_default.register(instance2)
    return instance2
  }
  function modules (instance2) {
    const modules2 = instance2.options.modules
    for (let i = 0; i < modules2.length; i++) {
      if (typeof modules2[i] === 'function') {
        modules2[i](instance2)
      } else {
        Object.assign(instance2, modules2[i])
      }
    }
  }
  const init_default = init3

  // ../../node_modules/material/src/drawer.js
  const defaults8 = {
    prefix: 'material',
    class: 'drawer',
    modifier: 'width',
    state: 'closed',
    position: 'left',
    tag: 'div',
    width: '340',
    modules: [emitter_default, events_default]
  }
  const Drawer = class {
    constructor (options) {
      this.options = Object.assign({}, defaults8, options || {})
      init_default(this)
      this.build()
      this.attach()
      this.emit('ready')
      return this
    }

    build () {
      this.wrapper = create_default2('div')
      classify_default(this.wrapper, this.options)
      this.root = create_default2('aside')
      css_default.add(this.root, 'drawer-panel')
      insert_default(this.root, this.wrapper)
      if (this.options.position) {
        css_default.add(this.root, 'position-' + this.options.position)
      }
      if (this.options.fixed) {
        this.wrapper.classList.add('is-fixed')
      }
      if (this.options.size) {
        if (this.options.position === 'top' || this.options.position === 'bottom') {
          this.root.style = 'height: ' + this.options.size + 'px;'
        } else {
          this.root.style = 'width: ' + this.options.size + 'px;'
        }
      }
      if (this.options.container) {
        insert_default(this.wrapper, this.options.container)
      }
      this.emit('built', this.root)
      return this
    }

    attach () {
      this.wrapper.addEventListener('click', (e2) => {
        console.log(' click close')
        this.close()
      })
    }

    toggle () {
      if (this.wrapper.classList.contains('show')) {
        this.close()
      } else {
        this.open()
      }
      return this
    }

    close () {
      css_default.remove(this.wrapper, 'show')
      return this
    }

    open () {
      css_default.add(this.wrapper, 'show')
      return this
    }

    insert (container, context) {
      insert_default(this.wrapper, container, context)
      return this
    }
  }
  const drawer_default = Drawer

  // ../../node_modules/material/src/item.js
  const defaults9 = {
    prefix: 'material',
    class: 'item',
    type: 'default',
    tag: 'li',
    types: {
      default: 'span',
      display4: 'h1',
      display3: 'h1',
      display2: 'h1',
      display1: 'h1',
      headline: 'h1',
      title: 'h2',
      subheading2: 'h3',
      subheading1: 'h4',
      body: 'p',
      body2: 'aside',
      caption: 'span'
    }
  }
  const Item = class {
    constructor (options) {
      this.init(options)
      this.build()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults9, options || {})
      Object.assign(this, insert_default2)
    }

    build () {
      this.options.tag = this.options.tag || this.options.types[this.options.type]
      this.options.tag = this.options.tag
      this.root = create_default(this.options)
      if (this.options.text) {
        this.set(this.options.text)
      }
      if (this.options.layout) {
        this.layout = new layout_default(this.options.layout, this.root)
      } else {
        if (this.options.container) {
          this.insert(this.options.container)
        }
      }
    }

    set (value) {
      if (value) {
        if (this.root.innerText) {
          this.root.innerText = value
        } else {
          this.root.textContent = value
        }
        return this
      }
      return this
    }
  }
  const item_default = Item

  // ../../node_modules/material/src/list.js
  const defaults10 = {
    prefix: 'material',
    class: 'list',
    tag: 'ul',
    functions: ['render', 'select'],
    target: '.material-item',
    events: [
      ['root.click', 'handleSelect']
    ]
  }
  const List = class {
    constructor (options) {
      this.options = Object.assign({}, defaults10, options || {})
      this.init(this.options)
      this.build(this.options)
      this.attach(this.options.events)
      return this
    }

    init () {
      this.filters = []
      this.data = []
      this.items = []
      Object.assign(this, emitter_default, attach_default)
      this._initFunction(this.options.functions)
      return this
    }

    _initFunction (functions) {
      for (let i = 0; i < functions.length; i++) {
        const name = functions[i]
        if (this.options[name]) {
          this[name] = this.options[name]
        }
      }
    }

    build (options) {
      const tag = this.options.tag || 'ul'
      this.root = document.createElement(tag)
      css_default.add(this.root, 'material-' + this.options.class)
      if (options.name) {
        css_default.add(this.root, options.class + '-' + options.name)
      }
      if (options.type) {
        css_default.add(this.root, 'type-' + options.type)
      }
      if (options.layout) {
        css_default.add(this.root, 'layout-' + options.layout)
      }
      if (this.options.list) {
        this.set('list', this.options.list)
      }
      if (this.options.container) {
        insert_default(this.root, this.options.container)
      }
      return this
    }

    handleSelect (e2) {
      if (e2.target && e2.target.matches(this.options.target)) {
        css_default.remove(this.item, 'is-selected')
        css_default.add(e2.target, 'is-selected')
        this.select(e2.target, e2, this.item)
        this.item = e2.target
      }
    }

    select (item, e2, selected) {
      this.emit('select', item)
    }

    render (info) {
      let item
      if (info.type === 'divider') {
        item = new divider_default()
      } else {
        item = new item_default({
          name: info.name,
          text: info.text || info.name
        })
      }
      return item
    }

    set (prop, value, options) {
      switch (prop) {
        case 'list':
          this.setList(value, options)
          break
        default:
          this.setList(prop, options)
      }
      return this
    }

    setList (list3) {
      for (let i = 0; i < list3.length; i++) {
        this.addItem(this.render(list3[i]), i)
      }
      return this
    }

    addItem (item) {
      if (!item) {
        return
      }
      const where = 'bottom'
      insert_default(item.root, this.root, where)
      this.items.push(item)
      return item
    }

    insert (container, context) {
      insert_default(this.root, container, context)
    }

    empty () {
      this.root.innerHTML = ''
      this.items = []
      this.item = null
    }

    reverse () {
      this.list.reverse()
      this.update(this.list)
      return this
    }
  }
  const list_default = List

  // ../../node_modules/material/src/progress.js
  const defaults11 = {
    prefix: 'material',
    class: 'progress',
    tag: 'div',
    progress: '0%',
    circular: `<svg class="progress" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
      <circle class="path" fill="none" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
    </svg>`
  }
  const Spinner = class {
    constructor (options) {
      this.init(options)
      this.build()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults11, options || {})
      Object.assign(this, insert_default)
    }

    build (options) {
      this.root = create_default2(this.options.tag)
      classify_default(this.root, this.options)
      if (this.options.type === 'circular') {
        this.root.innerHTML = this.options.circular
      }
      if (this.options.type === 'indeterminate') {
        this.bar = create_default2('div', 'bar')
        insert_default(this.bar, this.root)
      } else {
        this.bar = create_default2('div', 'bar')
        insert_default(this.bar, this.root)
        this.set(this.options.progress)
      }
      if (this.options.container) {
        insert_default(this.root, this.options.container)
      }
      return this
    }

    set (progress) {
      this.bar.setAttribute('style', 'width: ' + progress)
    }
  }
  const progress_default = Spinner

  // ../../node_modules/material/src/skin/material/icon/pin.svg
  const pin_default = 'export default `\n<svg width="24px" class="slider-pin" height="32px" viewBox="0 0 24 32">\n  <path d="M12.4799395,31.9994146 C12.4799395,31.9994146 24,18.0312233 24,11.6159251 C24,5.2006268 18.627417,0 12,0 C5.372583,0 0,5.2006268 0,11.6159251 C0,18.0312233 12.4799395,31.9994146 12.4799395,31.9994146 Z"></path>\n</svg>`;'

  // ../../node_modules/material/src/slider.js
  const defaults12 = {
    prefix: 'material',
    class: 'slider',
    type: 'control',
    label: null,
    checked: false,
    error: false,
    value: false,
    range: [0, 100],
    step: 5,
    modules: [events_default, control_default, emitter_default, attach_default],
    mixins: [],
    build: [
      '$root.material-slider',
      {},
      ['label$label.slider-label', {}],
      ['input$input'],
      [
        '$control.slider-control',
        {},
        [
          '$track.slider-track',
          {},
          ['canvas$canvas.slider-canvas', {}],
          ['$trackvalue.slider-track-value', {}],
          ['$knob.slider-knob', {}],
          [
            '$marker.slider-marker',
            {},
            ['$value.slider-value', {}]
          ]
        ]
      ]
    ],
    events: [
      ['element.input.focus', 'focus'],
      ['element.input.blur', 'blur']
    ]
  }
  const Slider = class {
    constructor (options) {
      this.options = Object.assign({}, defaults12, options || {})
      this.init(this.options)
      this.build(this.options)
      this.attach()
      return this
    }

    init (options) {
      init_default(this)
      return this
    }

    build () {
      this.element = build_default(this.options.build)
      this.root = this.element.root
      classify_default(this.root, this.options)
      if (this.options.container) {
        insert_default(this.root, this.options.container)
      }
      const value = this.element.marker.innerHTML
      this.element.marker.innerHTML = pin_default + value
      if (this.options.type) {
        css_default.add(this.root, 'type-' + this.options.type)
      }
      if (this.options.disabled) {
        this.disable(true)
      }
      const text = this.options.label || this.options.text
      this.element.label.textContent = text
      this.options.label = this.options.label || this.options.text
      this.initTrack()
      const delay = 50
      setTimeout(() => {
        this.initCanvas()
      }, delay)
    }

    initCanvas () {
      window.addEventListener('resize', () => {
        console.log('resize')
        this.drawCanvas()
      }, false)
      this.drawCanvas()
    }

    drawCanvas () {
      const width = offset_default(this.element.track, 'width')
      const height = offset_default(this.element.track, 'height')
      this.element.canvas.width = width
      this.element.canvas.height = height
      const context = this.element.canvas.getContext('2d')
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(0, height / 2 + 1)
      context.lineTo(width, height / 2 + 1)
      context.strokeStyle = 'rgba(34, 31, 31, .26)'
      context.stroke()
    }

    initTrack () {
      this.element.track.addEventListener('mousedown', (ev) => {
        if (this.disabled === true) { return }
        this.initTrackSize()
        const position = ev.layerX
        this.update(position)
      })
      this.element.knob.addEventListener('click', (ev) => {
        ev.stopPropagation()
      })
      this.initDragging()
      const delay = 100
      setTimeout(() => {
        this.setValue(this.options.value)
      }, delay)
    }

    initTrackSize () {
      this._tracksize = offset_default(this.element.track, 'width')
      this._knobsize = offset_default(this.element.knob, 'width')
      this._markersize = 32
      this._trackleft = offset_default(this.element.track, 'left')
      return this
    }

    initDragging () {
      this.element.knob.onmousedown = (e2) => {
        if (this.disabled === true) { return }
        e2.stopPropagation()
        e2 = e2 || window.event
        css_default.add(this.element.control, 'dragging')
        let start = 0
        let position = 0
        if (e2.pageX) { start = e2.pageX } else if (e2.clientX) { start = e2.clientX }
        start = this._trackleft
        document.body.onmousemove = (e3) => {
          if (this.disabled === true) { return }
          console.log('mousedown', this.disabled)
          e3 = e3 || window.event
          let end = 0
          if (e3.pageX) { end = e3.pageX } else if (e3.clientX) { end = e3.clientX }
          position = end - start
          this.update(position)
        }
        document.body.onmouseup = (e3) => {
          document.body.onmousemove = document.body.onmouseup = null
          e3 = e3 || window.event
          let end = 0
          if (e3.pageX) { end = e3.pageX } else if (e3.clientX) { end = e3.clientX }
          position = end - start
          this.update(position)
          css_default.remove(this.element.control, 'dragging')
        }
      }
    }

    update (position) {
      const size = this._tracksize
      const range = this.options.range[1] - this.options.range[0]
      if (position > size) {
        position = size
      }
      if (position < 0) {
        position = 0
      }
      const ratio = size / position
      const value = Math.round(range / ratio) + this.options.range[0]
      if (position === 0) {
        css_default.remove(this.element.knob, 'notnull')
      }
      this.element.knob.style.left = position - this._knobsize / 2 + 'px'
      this.element.trackvalue.style.width = position + 'px'
      this.element.marker.style.left = position - this._markersize / 2 + 'px'
      this.element.value.textContent = value
      this.element.input.value = value
      if (value > this.options.range[0]) {
        css_default.add(this.element.knob, 'notnull')
      } else {
        css_default.remove(this.element.knob, 'notnull')
      }
    }

    updateValue (value) {
      this.initTrackSize()
      let size = offset_default(this.element.track, 'width')
      size = parseInt(size)
      const range = this.options.range[1] - this.options.range[0]
      const ratio = value * 100 / range
      const position = Math.round(size * ratio / 100)
      this.update(position)
      return this
    }

    insert (container, context) {
      insert_default(this.root, container, context)
    }

    set (prop, value) {
      switch (prop) {
        case 'value':
          this.setValue(value)
          break
        case 'label':
          this.setLabel(value)
          break
        default:
          this.setValue(prop)
      }
      return this
    }

    get (prop) {
      let value
      switch (prop) {
        case 'value':
          value = this.getValue()
          break
        case 'name':
          value = this.name
          break
        default:
          return this.getValue()
      }
      return value
    }

    getValue () {
      return this.element.input.value
    }

    setValue (value) {
      value = value || this.options.range[0]
      this.element.input.value = value
      this.updateValue(value)
    }

    setLabel (text) {
      text = text || this.options.label || this.options.text
      if (text !== null && this.label) {
        this.label.textContent = text
      }
    }
  }
  const slider_default = Slider

  // ../../node_modules/material/src/switch.js
  const defaults13 = {
    prefix: 'material',
    class: 'switch',
    type: 'control',
    label: null,
    checked: false,
    error: false,
    value: false,
    disabled: false,
    build: [
      '$root.material-switch',
      {},
      ['input$input$switch-input', { type: 'checkbox' }],
      [
        'span$control.switch-control',
        {},
        [
          'span$track.switch-track',
          {},
          ['span$knob.switch-knob', {}]
        ]
      ],
      ['label$label.switch-label']
    ],
    events: [
      ['element.control.click', 'toggle'],
      ['element.label.click', 'toggle'],
      ['element.input.click', 'toggle'],
      ['element.input.focus', 'focus'],
      ['element.input.blur', 'blur']
    ]
  }
  const Switch = class {
    constructor (options) {
      this.init(options)
      this.build()
      this.attach()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults13, options || {})
      Object.assign(this, emitter_default, control_default, attach_default, insert_default2)
      this.value = this.options.value
      return this
    }

    build () {
      this.element = build_default(this.options.build)
      this.root = this.element.root
      classify_default(this.root, this.options)
      if (this.options.disabled) {
        this.disable()
      }
      if (this.value) {
        this.element.input.setAttribute('checked', 'checked')
      }
      this.element.input.setAttribute('aria-label', this.options.name)
      const text = this.options.label || this.options.text || ''
      this.element.label.textContent = text
      this.element.label.setAttribute('for', this.options.name)
      if (this.options.checked) {
        this.check(true)
      }
      if (this.options.container) {
        this.insert(this.options.container)
      }
    }

    set (prop, value) {
      switch (prop) {
        case 'value':
          this.setValue(value)
          break
        case 'disabled':
          if (value === true) {
            this.disable()
          } else if (value === false) {
            this.enable()
          }
          break
        default:
          this.setValue(prop)
      }
      return this
    }

    get () {
      return this.value
    }

    getValue () {
      return this.value
    }

    setValue (value) {
      if (value) {
        this.check()
      } else {
        this.unCheck()
      }
    }
  }
  const switch_default = Switch

  // ../../node_modules/material/src/tabs.js
  const defaults14 = {
    prefix: 'material',
    class: 'tabs',
    tag: 'div',
    indicator: {
      prefix: 'material',
      class: 'indicator',
      tag: 'div'
    }
  }
  const Tabs = class {
    constructor (options) {
      this.init(options)
      this.build()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults14, options || {})
      Object.assign(this, insert_default2, emitter_default)
    }

    build () {
      this.root = create_default(this.options)
      if (this.options.list) {
        this.list = new list_default({
          list: this.options.list,
          target: '.material-button',
          height: 600,
          label: 'Flat',
          render: (info) => {
            let item
            item = new Button_default({
              name: info.name,
              text: info.text || info.name
            })
            return item
          },
          select: (item) => {
            console.log('click')
            this.selected = item
            this.click(item)
          }
        }).insert(this.root)
      }
      this.indicator = create_default(this.options.indicator)
      this.insertElement(this.indicator, this.root)
      if (this.options.container) {
        this.insert(this.options.container)
      }
      return this
    }

    click (item) {
      const or = offset_default(this.root)
      const o = offset_default(item)
      this.indicator.setAttribute('style', 'width: ' + o.width + 'px; left: ' + (o.left - or.left) + 'px;')
      this.emit('select', item.dataset.name)
    }
  }
  const tabs_default = Tabs

  // ../../node_modules/material/src/text.js
  const defaults15 = {
    prefix: 'material',
    class: 'text',
    type: 'default',
    types: {
      default: 'span',
      display4: 'h1',
      display3: 'h1',
      display2: 'h1',
      display1: 'h1',
      headline: 'h1',
      title: 'h2',
      subheading2: 'h3',
      subheading1: 'h4',
      body: 'p',
      body2: 'aside',
      caption: 'span'
    }
  }
  const Text = class {
    constructor (options) {
      this.init(options)
      this.build()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults15, options || {})
      Object.assign(this, insert_default2)
    }

    build () {
      this.options.tag = this.options.types[this.options.type]
      this.root = create_default(this.options)
      if (this.options.text) {
        this.set(this.options.text)
      }
      if (this.options.container) {
        this.insert(this.options.container)
      }
      return this
    }

    set (value) {
      if (value) {
        if (this.root.innerText) {
          this.root.innerText = value
        } else {
          this.root.textContent = value
        }
        return this
      }
      return this
    }
  }
  const text_default = Text

  // ../../node_modules/material/src/toolbar.js
  const defaults16 = {
    prefix: 'material',
    class: 'toolbar',
    tag: 'header'
  }
  const Toolbar = class {
    constructor (options) {
      this.init(options)
      this.build()
      this.attach()
      return this
    }

    init (options) {
      this.options = Object.assign({}, defaults16, options || {})
      Object.assign(this, insert_default2)
      console.log('waterfALL', this.options.waterfall)
      this.waterfall = this.options.waterfall
    }

    build () {
      this.root = create_default(this.options)
      console.log(this.options.height, this.options.fixed)
      if (this.options.height) {
        this.root.style.height = this.options.height + 'px'
      }
      if (this.options.fixed) {
        console.log('is-fixed')
        this.root.classList.add('is-fixed')
      }
      if (this.options.flexible) {
        this.root.classList.add('is-flexible')
      }
      return this
    }

    attach () {
      this.root.addEventListener('DOMNodeInserted', (e2) => {
        const textNode = e2.target
        if (textNode !== this.root) { return }
        const size = this.size = offset_default(this.root, 'height')
        const view = this.view = this.root.parentNode
        console.log('view', view)
        let padding = window.getComputedStyle(view)['padding-top']
        padding = parseInt(padding, 10)
        this.padding = padding
        const ptop = this.ptop = size + padding
        if (document.body == view) {
          console.log('toolbar container body')
          this.root.classList.add('toolbar-body')
        }
        view.setAttribute('style', 'padding-top: ' + ptop + 'px')
        this.scroll(view)
      })
    }

    set (prop, value) {
      switch (prop) {
        case 'minimize':
          this.root.setAttribute('style', 'height: 64px')
          break
        case 'value':
          this.setValue(value)
          break
        case 'label':
          this.setLabel(value)
          break
        default:
          this.check(prop)
      }
      return this
    }

    scroll (view) {
      let isBody = false
      let element = view
      this.scrolling = view
      if (view === document.body) {
        isBody = true
        element = document
        this.scrolling = document.body
      }
      view.classList.add()
      element.addEventListener('scroll', (e2) => {
        let scrollTop
        if (isBody) {
          scrollTop = (document.documentElement || document.body.parentNode || document.body).scrollTop
        } else {
          scrollTop = view.scrollTop
        }
        if (scrollTop > 0) {
          this.root.classList.add('is-scrolled')
        } else {
          this.root.classList.remove('is-scrolled')
        }
        this.update(e2, scrollTop)
      })
    }

    update (e2, scrollTop) {
      if (this.options.fixed) {
        this.fixed(e2, scrollTop)
      }
      if (this.options.flexible) {
        this.flexible(e2, scrollTop)
      }
    }

    flexible (e2, scrollTop) {
      const size = offset_default(this.root, 'height')
      let height = '64'
      if (size < height) {
        this.root.style.height = height + 'px'
      } else {
        height = this.size - scrollTop
        if (height < 64) { height = 64 }
        this.root.style.height = height + 'px'
      }
    }

    fixed (e2, scrollTop) {
      if (scrollTop > 0) {
        this.root.style.transform = 'translateY(' + scrollTop + 'px)'
      } else {
        this.root.style.transform = 'translateY(' + scrollTop + 'px)'
      }
    }

    waterfall$ (e2) {
    }
  }
  const toolbar_default = Toolbar

  // src/module/css.js
  const has2 = (element, className) => {
    if (!element || !className) { return false }
    return !!element.className.match(new RegExp(`(\\s|^)${className}(\\s|$)`))
  }
  const add2 = (element, className) => {
    if (!element || !className) { return }
    const sanitizedClassName = className.trim().replace(/\s+/g, ' ')
    const classNames = sanitizedClassName.split(' ')
    for (const cn of classNames) {
      if (!has2(element, cn)) {
        element.classList.add(cn)
      }
    }
    return element
  }
  const remove4 = (element, className) => {
    if (!element || !className) { return }
    element.classList.remove(className)
    return element
  }
  const toggle2 = (element, className) => {
    if (has2(element, className)) {
      remove4(element, className)
    } else {
      add2(element, className)
    }
    return element
  }
  const css_default2 = { has: has2, add: add2, remove: remove4, toggle: toggle2 }

  // dist/icon/navi.svg
  const navi_default = 'export default `\n<svg height="24" viewBox="0 0 24 24" width="24">\n  <path d="M0 0h24v24H0z" fill="none" />\n  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />\n</svg>`;'

  // dist/icon/more.svg
  const more_default = 'export default `\n<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">\n  <path d="M0 0h24v24H0z" fill="none" />\n  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />\n</svg>`'

  // dist/icon/star.svg
  const star_default = 'export default `\n<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">\n    <path d="M0 0h24v24H0z" fill="none"/>\n    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>\n    <path d="M0 0h24v24H0z" fill="none"/>\n</svg>\n `;'

  // dist/icon/happy.svg
  const happy_default = 'export default `\n<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">\n    <path d="M11.99 2C6.47 2 2 6.47 2 12s4.47 10 9.99 10S22 17.53 22 12 17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm1-10.06L14.06 11l1.06-1.06L16.18 11l1.06-1.06-2.12-2.12zm-4.12 0L9.94 11 11 9.94 8.88 7.82 6.76 9.94 7.82 11zM12 17.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>\n    <path d="M0 0h24v24H0z" fill="none"/>\n</svg>\n `'

  // dist/demo.js
  console.log('demo')
  console.log('log')
  const list2 = [{
    text: 'One',
    name: 'one'
  }, {
    text: 'Two',
    name: 'two'
  }, {
    text: 'Three',
    name: 'three'
  }, {
    text: 'Four',
    name: 'four'
  }]
  document.addEventListener('DOMContentLoaded', function () {
    const layout = new layout_default([
      component_default,
      'demo',
      { display: 'flex', direction: 'vertical' },
      [
        component_default,
        'head',
        { display: 'flex', direction: 'horizontal' },
        [
          toolbar_default,
          'toolbar',
          { flex: 1, display: 'flex', direction: 'horizontal' },
          [Button_default, 'menu-navi', { icon: navi_default, type: 'action' }],
          [text_default, 'app-title', { text: 'Material' }]
        ],
        [
          toolbar_default,
          'desk',
          { display: 'flex', direction: 'horizontal' },
          [Button_default, 'menu-more', { icon: more_default, type: 'action' }]
        ]
      ],
      [
        drawer_default,
        'navi',
        { css: 'drawer-temporary', type: 'temporary', size: '280px' },
        [
          component_default,
          'navi-head',
          { theme: 'dark' },
          [text_default, 'app-title', { text: 'Components' }]
        ],
        [list_default, 'navi-list', { theme: 'dark' }]
      ],
      [tabs_default, 'tabs', { color: 'primary', list: list2, flex: 'none' }],
      [
        container_default,
        'body',
        { flex: '1' },
        [
          container_default,
          'container-components',
          {},
          [text_default, 'text', { text: 'Components', type: 'title' }]
        ],
        [
          card_default,
          'buttons',
          {},
          [
            toolbar_default,
            'toolbar-buttons',
            {},
            [text_default, 'buttons-title', { text: 'Buttons' }]
          ],
          [
            container_default,
            'button-body',
            {},
            [Button_default, 'first', { text: 'Flat' }],
            [Button_default, 'second', { text: 'Raised', type: 'raised', color: 'primary' }],
            [Button_default, 'third', { icon: star_default, type: 'action' }],
            [Button_default, 'fourth', { icon: star_default, text: 'text' }]
          ]
        ],
        [
          card_default,
          'buttons',
          {},
          [
            toolbar_default,
            'toolbar-buttons',
            {},
            [text_default, 'buttons-title', { text: 'Floating Buttons' }]
          ],
          [
            container_default,
            'button-body',
            {},
            [Button_default, 'fifth', { icon: star_default, type: 'floating', color: 'primary' }],
            [Button_default, 'six', { icon: happy_default, type: 'floating', style: 'mini', color: 'primary' }],
            [Button_default, 'fifth', { icon: star_default, type: 'floating', color: 'secondary' }],
            [Button_default, 'six', { icon: happy_default, type: 'floating', style: 'mini', color: 'secondary' }]
          ]
        ],
        [
          card_default,
          'checkboxes',
          {},
          [
            toolbar_default,
            'toolbar',
            {},
            [text_default, 'checkbox-title', { text: 'Checkboxes' }]
          ],
          [
            container_default,
            'checkbox-body',
            {},
            [checkbox_default2, 'checkbox', { text: 'Checkbox' }],
            [checkbox_default2, 'checkbox-checked', { text: 'Checked', checked: true }],
            [checkbox_default2, 'checkbox-disabled', { text: 'Disabled', disabled: true }]
          ]
        ],
        [
          card_default,
          'switches',
          {},
          [
            toolbar_default,
            'switch-toolbar',
            {},
            [text_default, 'switch-title', { text: 'Switches' }]
          ],
          [
            container_default,
            'switch-body',
            {},
            [switch_default, 'switch', { text: 'Switch' }],
            [switch_default, 'switch-checked', { text: 'Checked', checked: true }],
            [switch_default, 'switch-disabled', { text: 'Disabled', disabled: true }]
          ]
        ],
        [
          card_default,
          'progress indicators',
          {},
          [
            toolbar_default,
            'progress-toolbar',
            {},
            [text_default, 'progress-title', { text: 'Progress indicators' }]
          ],
          [
            container_default,
            'progress-body',
            {},
            [progress_default, 'progress', { progress: '60%' }],
            [progress_default, 'progress-indeterminate', { type: 'indeterminate' }]
          ]
        ],
        [
          card_default,
          'sliders',
          {},
          [
            toolbar_default,
            'slider-toolbar',
            {},
            [text_default, 'slider-title', { text: 'Sliders' }]
          ],
          [
            container_default,
            'slider-body',
            {},
            [slider_default, 'slider', { text: 'Slider' }],
            [slider_default, 'slider-checked', { text: 'Checked', checked: true }],
            [slider_default, 'slider-disabled', { text: 'Disabled', disabled: true }]
          ]
        ]
      ]
    ], document.body)
    const moreButton = layout.get('menu-more').on('click', (e2) => {
      layout.get('more-menu').show(e2)
    })
    layout.get('body').root.addEventListener('scroll', (e2) => {
      if (layout.get('body').root.scrollTop > 0) {
        css_default2.add(layout.get('tabs').root, 'head-shadow')
      } else {
        css_default2.remove(layout.get('tabs').root, 'head-shadow')
      }
    })
    const naviMenu = layout.get('menu-navi')
    naviMenu.on('click', (e2) => {
      layout.get('navi').open()
    })
  })
})()
// # sourceMappingURL=demo-bundle.js.map

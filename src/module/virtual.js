import passiveEvents from '../module/passive'
import emitter from '../module/emitter'

// based on https://sergimansilla.com/blog/virtual-scrolling/

function VirtualList (options) {
  this.options = options

  this.itemHeight = options.itemHeight

  // console.log('itemHeight', this.itemHeight)

  this.size = options.size

  this.items = options.items
  this.render = options.render

  this.scroller = VirtualList.createScroller()
  this.container = options.container

  Object.assign(this, emitter)

  this.container.classList.add('virtual')
}

VirtualList.prototype._renderChunk = function (node, from, number) {
  // console.log('_renderChunk', from, number)
  var fragment = document.createDocumentFragment()
  fragment.appendChild(this.scroller)

  var last = from + number
  if (last > this.count) last = this.count

  for (var i = from; i < last; i++) {
    var item
    if (this.render) item = this.render(i)
    else {
      if (typeof this.items[i] === 'string') {
        var itemText = document.createTextNode(this.items[i])
        item = document.createElement('div')
        item.style.height = this.height
        item.appendChild(itemText)
      } else {
        item = this.items[i]
      }
    }

    item.style.position = 'absolute'
    item.style.top = i * this.itemHeight + 'px'
    fragment.appendChild(item)
  }

  node.innerHTML = ''
  node.appendChild(fragment)

  // console.log('check next', last, this.count, this.size)

  if (/* this.count < this.size && */ last > this.count - this.size / 2) {
    // console.log('next', last, this.count, this.size)
    this.emit('next', this.count)
  }

  // console.log('last', final, this.count)
}

VirtualList.prototype.set = function (items) {
  // console.log('set', items.length, this.count)
  this.items = items
  this.count = items.length

  // console.log('count', this.count)

  if (this.count < 1 || this.count === undefined) return

  this.container.innerHTML = ''
  this.container.scrollTop = 0

  var height = this.itemHeight * this.count

  this.scroller.style.height = height + 'px'

  var itemsByScreen = Math.ceil(this.container.offsetHeight / this.itemHeight)

  // console.log('offsetHeioght', this.container.offsetHeight)
  // console.log('itemsByScreen', itemsByScreen)

  // Cache 4 times the number of items that fit in the container viewport
  var size = itemsByScreen * 4
  this._renderChunk(this.container, 0, size)

  this.size = size

  this.emit('size', size)

  var self = this
  var lastRepaintY
  var maxBuffer = itemsByScreen * this.itemHeight

  function onScroll (e) {
    // console.log('scroll', e.target.scrollTop, height)
    var scrollTop = e.target.scrollTop

    // console.log('offsetHeight', self.container.offsetHeight)
    // console.log('size', self.size)
    if (itemsByScreen === 0) {
      itemsByScreen = Math.ceil(self.container.offsetHeight / self.itemHeight)
      size = self.size = itemsByScreen * 4
    }

    // console.log('scrollTop', scrollTop)

    if (scrollTop < 0) return

    // console.log('itemHeight', scrollTop, self.itemHeight, itemsByScreen)

    var first = parseInt(scrollTop / self.itemHeight) - itemsByScreen
    first = first < 0 ? 0 : first

    if (!lastRepaintY || Math.abs(scrollTop - lastRepaintY) > maxBuffer) {
      self._renderChunk(self.container, first, size)
      lastRepaintY = scrollTop
    }

    var progress = Math.ceil((scrollTop / self.itemHeight) + itemsByScreen) - 1
    // console.log('progress', progress, self.size, self.count)
    self.emit('progress', progress)

    // e.preventDefault && e.preventDefault()
  }

  // console.log('this.scrollEvents', this.scrollEvents)

  if (!this.scrollEvents) {
    this.container.addEventListener('scroll', onScroll, passiveEvents() ? { passive: true } : false)
    this.scrollEvents = true
  }

  // this.container.addEventListener('scroll', onScroll)
}

VirtualList.prototype.update = function (items) {
  // console.log('update', items.length)
  this.items = items || this.items

  if (!this.items) return

  this.count = this.items.length

  var itemsByScreen = Math.ceil(this.container.offsetHeight / this.itemHeight)
  var cachedItemsLen = itemsByScreen * 4
  var scrollTop = this.container.scrollTop

  var height = this.itemHeight * this.count

  this.scroller.style.height = height + 'px'

  var first = parseInt(scrollTop / this.itemHeight) - itemsByScreen
  first = first < 0 ? 0 : first

  this._renderChunk(this.container, first, cachedItemsLen)
}

VirtualList.prototype.add = function (items) {
  // console.log('add', items.length)
  this.items = items || this.items

  if (!this.items) return

  this.count = this.items.length

  var height = this.itemHeight * this.count

  this.scroller.style.height = height + 'px'
}

VirtualList.prototype.reset = function () {
  // console.log('reset', items.length)
  this.items = []
  this.count = 0

  this.scroller.style.height = 0
}

VirtualList.prototype.getSize = function () {
  // console.log('getSize')

  var itemsByScreen = Math.ceil(this.container.offsetHeight / this.itemHeight)

  // Cache 4 times the number of items that fit in the container viewport
  var size = itemsByScreen * 4

  return size
}

VirtualList.prototype.getCount = function () {
  // console.log('getCount')

  return this.count
}

VirtualList.createScroller = function () {
  var scroller = document.createElement('div')
  scroller.classList.add('scroller')
  return scroller
}

export default VirtualList

import passiveEvents from '../module/passive'
import emitter from '../module/emitter'

function VirtualList (options) {
  this.options = options

  this.itemHeight = options.itemHeight

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

  var finalItem = from + number
  if (finalItem > this.totalRows) finalItem = this.totalRows

  for (var i = from; i < finalItem; i++) {
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

  if (finalItem > this.totalRows - this.size / 2) {
    // console.log('scrollNext', finalItem, this.totalRows, this.size)
    this.emit('scrollNext', this.totalRows)
  }

  // console.log('finalItem', finalItem, this.totalRows)
}

VirtualList.prototype.set = function (items) {
  // console.log('set', items.length)
  this.items = items
  this.totalRows = items.length

  if (this.totalRows < 1 || this.totalRows === undefined) return

  this.container.innerHTML = ''
  this.container.scrollTop = 0

  var totalHeight = this.itemHeight * this.totalRows

  this.scroller.style.height = totalHeight + 'px'

  var screenItemsLen = Math.ceil(this.container.offsetHeight / this.itemHeight)

  // Cache 4 times the number of items that fit in the container viewport
  var cachedItemsLen = screenItemsLen * 4
  this._renderChunk(this.container, 0, cachedItemsLen / 2)

  var self = this
  var lastRepaintY
  var maxBuffer = screenItemsLen * this.itemHeight

  function onScroll (e) {
    // console.log('scroll', e.target.scrollTop, totalHeight)
    var scrollTop = e.target.scrollTop

    // console.log('scrollTop', scrollTop)

    if (scrollTop < 0) return

    var first = parseInt(scrollTop / self.itemHeight) - screenItemsLen
    first = first < 0 ? 0 : first

    if (!lastRepaintY || Math.abs(scrollTop - lastRepaintY) > maxBuffer) {
      self._renderChunk(self.container, first, cachedItemsLen)
      lastRepaintY = scrollTop
    }

    var progress = Math.ceil((scrollTop / self.itemHeight) + screenItemsLen)
    // console.log('progress', progress)
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
  this.items = items || this.items

  if (!this.items) return

  this.totalRows = this.items.length

  var screenItemsLen = Math.ceil(this.container.offsetHeight / this.itemHeight)
  var cachedItemsLen = screenItemsLen * 4
  var scrollTop = this.container.scrollTop

  var totalHeight = this.itemHeight * this.totalRows

  this.scroller.style.height = totalHeight + 'px'

  var first = parseInt(scrollTop / this.itemHeight) - screenItemsLen
  first = first < 0 ? 0 : first

  this._renderChunk(this.container, first, cachedItemsLen)
}

VirtualList.prototype.add = function (items) {
  this.items = items || this.items

  if (!this.items) return

  this.totalRows = this.items.length

  var totalHeight = this.itemHeight * this.totalRows

  this.scroller.style.height = totalHeight + 'px'
}

VirtualList.createScroller = function () {
  var scroller = document.createElement('div')
  scroller.classList.add('scroller')
  return scroller
}

export default VirtualList

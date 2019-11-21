import passiveEvents from '../module/passive'

function VirtualList (options) {
  this.options = options
  this.itemHeight = options.itemHeight

  this.items = options.items
  this.render = options.render

  this.scroller = VirtualList.createScroller()
  this.container = options.container

  this.container.classList.add('virtual')
}

VirtualList.prototype._renderChunk = function (node, from, number) {
  // console.log('_renderChunk', node, from, number)
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
}

VirtualList.prototype.set = function (items) {
  // console.log('set', items)
  this.items = items
  this.totalRows = items.length

  if (this.totalRows < 1 || this.totalRows === undefined) return

  this.container.innerHTML = ''
  this.container.scrollTop = 0

  var totalHeight = this.itemHeight * this.totalRows

  this.scroller.style.height = totalHeight + 'px'

  var screenItemsLen = Math.ceil(this.container.offsetHeight / this.itemHeight)

  // Cache 4 times the number of items that fit in the container viewport
  var cachedItemsLen = screenItemsLen * 3
  this._renderChunk(this.container, 0, cachedItemsLen / 2)

  var self = this
  var lastRepaintY
  var maxBuffer = screenItemsLen * this.itemHeight

  function onScroll (e) {
    // console.log('scroll', e.target.scrollTop, this.itemHeight, screenItemsLen)
    var scrollTop = e.target.scrollTop

    // console.log('scrollTop', scrollTop)

    if (scrollTop < 0) return

    var first = parseInt(scrollTop / self.itemHeight) - screenItemsLen
    first = first < 0 ? 0 : first
    if (!lastRepaintY || Math.abs(scrollTop - lastRepaintY) > maxBuffer) {
      self._renderChunk(self.container, first, cachedItemsLen)
      lastRepaintY = scrollTop
    }

    e.preventDefault && e.preventDefault()
  }

  // this.container.addEventListener('scroll', onScroll, passiveEvents() ? { passive: true } : false)
  this.container.addEventListener('scroll', onScroll)
}

VirtualList.createContainer = function () {
  var container = document.createElement('div')
  container.classList.add('virtual')
  container.style.borderTop = '1px solid green'
  return container
}

VirtualList.createScroller = function () {
  var scroller = document.createElement('div')
  scroller.classList.add('scroller')
  return scroller
}

export default VirtualList

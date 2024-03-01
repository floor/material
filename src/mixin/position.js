export default {
  position (target, position) {
    target = target || this.options.target
    position = position || this.options.position
    const { offsetX = 0, offsetY = 0, align = 'center', vAlign = 'middle' } = position

    const name = this.constructor.name
    console.log('constructor', name)

    if (!target) return

    const caller = target.getBoundingClientRect()
    const screen = this.element.parentNode.getBoundingClientRect()
    const element = this.element.getBoundingClientRect()

    console.log('caller', caller)
    console.log('screen', screen)
    console.log('element', element)

    let left, top

    console.log('align', align)
    console.log('target left', caller.left)

    switch (align) {
      case 'left':
        left = caller.left + caller.width
        break
      case 'right':
        left = caller.left
        if (left + element.width + offsetX > screen.width) {
          console.log('out boundaries')
          left = caller.left - element.width + caller.width
        }
        break
      case 'center':
        left = caller.left + (caller.width / 2) - (element.width / 2)

      default:
        left = caller.left + (caller.width / 2) - (element.width / 2)
    }

    if (left < 0) left = offsetX

    if (left + element.width + offsetX > screen.width) {
      left = caller.left - element.width + caller.width - offsetX
    }

    console.log('left', left)

    // left = Math.max(offsetX, Math.min(left, screen.width - element.width - offsetX))

    const scrollY = window.scrollY

    // console.log('class', name)
    // console.log('scrollY', scrollY)
    // console.log('vAlign', vAlign)
    // console.log('target top', caller.top)

    switch (vAlign) {
      case 'top':
        top = caller.top + scrollY - element.height
        break
      case 'bottom':
        top = caller.top + caller.height + scrollY
        break
      case 'middle':
      case 'dynamic':
        if (caller.top + caller.height / 2 < screen.height / 2) {
          top = caller.bottom + scrollY // Positionner en dessous si dans la moitié supérieure
        } else {
          top = caller.top + scrollY - element.height // Positionner au-dessus si dans la moitié inférieure
        }
        break

      default:
        top = caller.top + scrollY + (caller.height / 2) - (element.height / 2)
    }

    // if (this.options.class !== 'menu') {
    //   top = Math.max(offsetY, Math.min(top, screen.height - element.height - offsetY))
    // }

    console.log('top', top)

    this.element.style.left = `${left}px`
    this.element.style.top = `${top}px`

    return this
  }
}

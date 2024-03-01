export default {
  position (target, position) {
    target = target || this.options.target
    position = position || this.options.position
    const { offsetX = 0, offsetY = 0, align = 'center', vAlign = 'middle' } = position

    const name = this.constructor.name

    if (!target) return

    const caller = target.getBoundingClientRect()
    const screen = this.element.parentNode.getBoundingClientRect()
    const element = this.element.getBoundingClientRect()

    let left, top

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

    // ensure that the element remains within the limits of its container

    if (left < 0) left = offsetX

    if (left + element.width + offsetX > screen.width) {
      left = screen.width - element.width - offsetX
    }

    // console.log('left', left)

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

    this.element.style.left = `${left}px`
    this.element.style.top = `${top}px`

    return this
  }
}

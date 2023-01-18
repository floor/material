
export default {
  toggle () {
    this.visible ? this.hide() : this.show()

    this.emit('toggle')
    return this
  },

  show () {
    // console.log('show', this.visible)

    // if (this.options.transition) {
    //   this.root.style.display = 'initial'
    // }

    this.root.getBoundingClientRect()

    // clearTimeout(this.displayTimeout)
    // this.root.style.display = this._display

    this.root.classList.add('show')
    this.visible = true

    if (this.underlay) {
      this.underlay.classList.add('show')
    }

    this.emit('show')
    return this
  },

  hide () {
    // console.log('hide', this.root.style.display)
    // if (this.root.style.display === 'none') return
    // clearTimeout(this.displayTimeout)
    // this._display = getComputedStyle(this.root).display

    if (!this.root) return

    this.root.classList.remove('show')
    this.visible = false

    if (this.underlay) {
      this.underlay.classList.remove('show')
    }

    // if (this.options.transition) {
    //   this.displayTimeout = setTimeout(() => {
    //     console.log('display: none', this._display)
    //     this.root.style.display = 'none'
    //   }, this.options.transition)
    // }

    this.emit('hide')
    return this
  },

  destroy () {
    // console.log('destroy', this.options.transition, this.root)
    if (this.options.transition && this.root) {
      this.root.classList.remove('show')

      if (this.underlay) {
        this.underlay.classList.remove('show')
      }

      setTimeout(() => {
        this.removeChild()
      }, this.options.transition)
    } else {
      this.removeChild()
    }

    this.emit('destroy')
  },

  removeChild () {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root)
      this.root = null
    }

    if (this.underlay && this.underlay.parentNode) {
      this.underlay.parentNode.removeChild(this.underlay)
    }

    this.emit('remove')
    return this
  }
}

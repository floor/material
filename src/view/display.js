
export default {
  toggle () {
    this.visible ? this.hide() : this.show()
  },

  show () {
    // console.log('show', this.display)

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

    this.root.classList.remove('show')
    this.visible = false

    if (this.underlay) {
      this.underlay.classList.remove('show')
    }

    // this.displayTimeout = setTimeout(() => {
    //   console.log('display: none', this._display)
    //   this.root.style.display = 'none'
    // }, 1000)

    this.emit('hide')
    return this
  },

  destroy () {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root)
    }
  }
}

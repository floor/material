
export default {
  hide () {
    this.root.classList.remove('show')
    this.visible = false
    this.emit('hide')
  },

  show () {
    // console.log('hide')
    this.root.classList.add('show')
    this.visible = true
    this.emit('show')
  },

  toggle () {
    this.visible ? this.hide() : this.show()
  }
}

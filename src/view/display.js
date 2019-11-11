
export default {
  toggle () {
    this.visible ? this.hide() : this.show()
  },

  show () {
    // console.log('show')
    this.root.classList.add('show')
    this.visible = true
    this.emit('show')
  },

  hide () {
    // console.log('show')
    this.root.classList.remove('show')
    this.visible = false
    this.emit('hide')
  }
}

export default {
  cancel (ev) {
    // console.log('cancel', this.info, this.mode)
    ev.preventDefault()

    this.render(this.info)

    if (this.mode === 'create') {
      this.mode = null
      this.emit('cancel', 'create')
    }

    this.setMode('read')

    return false
  }
}

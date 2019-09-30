export default {
  setMode (mode) {
    // console.log('setMode', mode)
    this.mode = mode

    if (mode === 'create') {
      this.ui.submit.setLabel('Create')
    }

    if (mode === 'edit') {
      this.ui.submit.setLabel('Apply')
    }

    this.emit('mode', mode)
  }
}

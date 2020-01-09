export default {
  setMode (mode) {
    // console.log('setMode', mode)
    this.mode = mode

    this.emit('mode', mode)
  },

  changeMode (mode) {
    if (mode === 'update' && this.enableControls) {
      this.enableControls()
    } else if (mode === 'update' && this.disableControls) {
      this.disableControls()
    } else if (mode === 'read' && this.disableControls) {
      this.disableControls()
    }
  }
}

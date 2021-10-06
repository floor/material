export default {
  setMode (mode, options) {
    // console.log('setMode', mode, this.options)
    if (this.mode === mode) return

    if (mode === 'unique') {
      this.setUnique()
    } else if (mode === 'multiple') {
      this.setMultiple()
    }
    this.mode = mode

    return this
  },

  setUnique () {
    this.isocodes = this.isocodes || []

    if (this.isocodes.length > 0) {
      this.list = this.isocodes.slice()
    }

    this.highlight(this.isocodes, false)

    this.isocodes = this.info.slice()
    this.highlight(this.isocodes)
  },

  setMultiple () {
    // console.log('setMultiple')

    this.info = this.isocodes.slice()

    this.highlight(this.isocodes, false)

    if (this.list) {
      this.isocodes = this.list.slice()
    }

    this.highlight(this.isocodes)

    return this
  }
}

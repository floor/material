
export default {

  initControls () {
    // console.log('setup')
    for (var field in this.field) {
      if (this.field.hasOwnProperty(field)) {
        var control = this.field[field]
        if (control && control.on) {
          control.on('change', () => {
            // console.log('change')
            if (this.enableControls) {
              this.enableControls()
            }
          })
        }
      }
    }

    for (var file in this.file) {
      if (this.file.hasOwnProperty(file)) {
        var control = this.file[file]
        if (control && control.on) {
          control.on('change', () => {
            // console.log('change')
            if (this.enableControls) {
              this.enableControls()
            }
          })
        }
      }
    }
  },

  enableControls () {
    if (!this.options.controls) return

    for (var i = 0; i < this.options.controls.length; i++) {
      if (this.options.controls[i].enable) {
        this.options.controls[i].enable()
      }
    }
  },

  disableControls () {
    if (!this.options.controls) return

    for (var i = 0; i < this.options.controls.length; i++) {
      if (this.options.controls[i].disable) {
        this.options.controls[i].disable()
      }
    }
  }
}

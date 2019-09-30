export default {
  setup () {
    // console.log('setup')
    for (var field in this.field) {
      if (this.field.hasOwnProperty(field)) {
        var control = this.field[field]
        if (control && control.on) {
          control.on('change', () => {
            // console.log('change')
            this.ui.submit.enable()
            this.ui.cancel.enable()
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
            this.ui.submit.enable()
            this.ui.cancel.enable()
          })
        }
      }
    }
  }
}

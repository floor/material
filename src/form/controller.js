
export default {

  initController () {
    // console.log('initController', this.field)

    this.disableControls()

    for (const field in this.field) {
      if (this.field.hasOwnProperty(field)) {
        this.bindControl(this.field[field])
      }
    }

    for (const file in this.file) {
      if (this.file.hasOwnProperty(file)) {
        this.bindControl(this.file[file])
      }
    }
  },

  setMode (mode) {
    // console.log('setMode', mode)
    this.mode = mode

    this.updateClassMode(mode)

    this.emit('mode', mode)
  },

  updateClassMode (mode) {
    const modes = ['read', 'create', 'update']

    for (let i = 0; i < modes.length; i++) {
      this.form.classList.remove(modes[i] + '-mode')
    }

    this.form.classList.add(mode + '-mode')
  },

  changeMode (mode) {
    // console.log('changeMode', mode)

    if (mode === 'update' && this.enableControls) {
      this.enableControls()
    } else if (mode === 'update' && this.disableControls) {
      this.disableControls()
    } else if (mode === 'read' && this.disableControls) {
      this.disableControls()
    }
  },

  bindControl (control) {
    // console.log('bindControl')
    if (control && control.on) {
      control.on('change', () => {
        // console.log('change', control, this.mode)
        if (this.mode === 'read') {
          this.setMode('update')
        }
      })
    }
  },

  enableControls () {
    // console.log('enableControls')
    const controls = this.options.controls || ['submit', 'cancel']

    if (controls === null) return

    for (let i = 0; i < controls.length; i++) {
      if (this.ui[controls[i]] && this.ui[controls[i]].enable) {
        this.ui[controls[i]].enable()
      }
    }
  },

  disableControls () {
    // console.log('disableControls')
    const controls = this.options.controls || ['submit', 'cancel']

    if (controls === null) return

    for (let i = 0; i < controls.length; i++) {
      if (this.ui[controls[i]] && this.ui[controls[i]].disable) {
        this.ui[controls[i]].disable()
      }
    }
  }
}

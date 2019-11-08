export default {

  submit (ev) {
    // console.log('submit', this.ui, this.file, this.info)
    // ev.preventDefault()
    if (this.verify && !this.verify()) return

    // console.log('submit')
    this.ui.submit.disable()
    this.ui.cancel.disable()

    var formData = new FormData()

    if (this.info && this.info._id) {
      formData.append('id', this.info._id)
      formData.append('uuid', this.info.uuid)
    }

    // append field

    for (var field in this.field) {
      if (this.field.hasOwnProperty(field)) {
        // console.log('append field', field, this.field[field])
        formData.append(field, this.field[field].get())
      }
    }

    // append files

    for (var file in this.file) {
      // console.log('this file', this.file, this.file[file].input)
      // console.log('file', file, this.file[file])
      if (this.file.hasOwnProperty(file) && this.file[file].input && this.file[file].input.value) {
        // console.log('---- append file', this.file[file].input.value)
        formData.append(file, this.file[file].input.files[0])
      }
    }

    // console.log('formData', formData.keys())

    var method = 'PUT'
    if (this.mode === 'create') {
      method = 'POST'
    }

    fetch(this.options.route, {
      method: method,
      body: formData
    }).then(r => r.json()).then(info => {
      if (info.error) {
        console.log('Error: ' + info.error)
      } else {
        // console.log('submit ok', info, this.mode)
        this.ui.submit.setLabel('Apply')

        if (this.mode === 'create') {
          this.emit('created', info)
          this.mode = null
        } else {
          this.info = info
          this.emit('updated', info)
        }
      }
    })
  }
}

export default {

  submit (ev) {
    ev.preventDefault()
    console.log('submit', this.ui, this.file, this.info)
    // ev.preventDefault()
    if (this.verify && !this.verify()) return

    // console.log('submit')
    if (this.disableControls) {
      this.disableControls()
    }

    var data = new FormData()

    if (this.info && this.info._id) {
      data.append('id', this.info._id)
    }

    if (this.info && this.info.uuid) {
      data.append('uuid', this.info.uuid)
    }

    this.appendFields(data)
    this.appendFiles(data)

    if (this.update) {
      this.update(data)
    } else {
      this.setMethod(data)
    }

    return false
  },

  setMethod (formData) {
    var method = 'PUT'
    if (this.mode === 'create') {
      method = 'POST'
    }

    if (this.fetch) {
      // console.log('formData', formData.keys())
      this.fetch({
        method: method,
        formData: formData
      })
    }

    if (this.action) {
      this.action({
        method: method,
        formData: formData
      })
    }
  },

  appendFields (formData) {
    for (var field in this.field) {
      if (this.field.hasOwnProperty(field)) {
        // console.log('append field', field, this.field[field].get())
        if (this.field[field].get() !== null) {
          formData.append(field, this.field[field].get())
        }
      }
    }
  },

  appendFiles (formData) {
    for (var file in this.file) {
      // console.log('this file', this.file, this.file[file].input)
      // console.log('file', file, this.file[file])
      if (this.file.hasOwnProperty(file) && this.file[file].input && this.file[file].input.value) {
        // console.log('---- append file', this.file[file].input.value)
        if (this.file[file].input.value) {
          formData.append(file, this.file[file].input.files[0])
        }
      }
    }
  }
}

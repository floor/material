import { byString } from '../module/object'

export default {

  submit (ev) {
    ev.preventDefault()
    // console.log('submit', this.mode)
    // ev.preventDefault()
    if (this.verify && !this.verify()) return

    // console.log('submit')
    if (this.disableControls) {
      this.disableControls()
    }

    var data = new FormData()

    if (this.info && this.info._id) {
      // console.log('id', this.info._id)
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
        // console.log('check field', field)
        var value = this.field[field].get()
        if (value !== null) {
          if (this.mode === 'update' && this.options.update && this.options.update.modifiedOnly) {
            var modified = this.isModified(field, value)
            if (modified) {
              formData.append(field, value)
            }
          } else {
            formData.append(field, value)
          }
        }
      }
    }
  },

  isModified (field, value) {
    var initial = byString(this.info, field)

    if (typeof initial === 'number') {
      value = Number(value)
    }

    if (initial !== value) {
      // console.log('field', field, typeof value, value)
      return true
    } else {
      return false
    }
  },

  appendFiles (formData) {
    // console.log('appendFiles', this.file)
    for (var file in this.file) {
      // console.log('this file', this.file, this.file[file].input)
      // console.log('file', file, this.file[file])
      if (this.file.hasOwnProperty(file) && this.file[file].input && this.file[file].input.value) {
        formData.append(file, this.file[file].input.files[0])
      }
    }
  }
}

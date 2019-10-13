import dot from '../module/dot'

export default {
  render (object, option) {
    console.log('render', object)

    var info = dot(object)

    for (var file in this.file) {
      if (this.file.hasOwnProperty(file)) {
        this.file[file].reset()
      }
    }

    // console.log('dotified', this.field, info)

    if (!info) return

    for (var field in this.field) {
      if (this.field.hasOwnProperty(field)) {
        // console.log('field type', field)
        if (
        this.field[field] &&
        this.field[field].set) {
          if (info[field] !== undefined) {
            this.field[field].set(info[field])
          } else if (object[field] !== undefined) {
            var value = this.objectValueByDotKey(object, field)
            this.field[field].set(value)
          }
        }
      }
    }

    this.ui.submit.disable()
    this.ui.cancel.disable()

    this.emit('rendered')

    // won't stay there
    if (option === 'create' && this.field['name']) {
      this.focusNameOnRender(this.field['name'])
    }
  },

  objectValueByDotKey (object, dotkey) {
    // console.log('objectValueByDotKey', object, dotkey)
    var keys = dotkey.split(/\./)

    var value
    var o = object

    for (var i = 0; i < keys.length; i++) {
      value = o[keys[i]]
    }

    return value
  },

  focusNameOnRender (field) {
    field.focus()
    field.input.select()
  }
}

import { byString } from '../module/object'

export default {

  initData () {
    // console.log('submit', this.mode)

    const data = new FormData()

    if (this.mode !== 'create') {
      this.appendSysinfo(data)
    }

    this.appendFields(data)
    this.appendFiles(data)

    return data
  },

  appendSysinfo (data) {
    const sys = this.options.sysinfo
    for (let i = 0; i < sys.length; i++) {
      // console.log('sys', sys[i], this.info[sys[i]])
      let name = sys[i]
      if (sys[i] === '_id') name = 'id'

      data.append(name, this.info[sys[i]])
    }

    return data
  },

  appendFields (data) {
    for (const field in this.field) {
      // console.log('field', field)
      if (this.field.hasOwnProperty(field)) {
        // console.log('check field', field)
        const value = this.field[field].get()
        if (value !== null) {
          if (this.mode === 'update' && this.options.update && this.options.update.modifiedOnly) {
            const modified = this.isModified(field, value)
            if (modified) {
              data.append(field, value)
            }
          } else {
            data.append(field, value)
          }
        }
      }
    }

    return data
  },

  appendFiles (data) {
    // console.log('appendFiles', this.file)
    for (const file in this.file) {
      // console.log('this file', this.file, this.file[file].input)
      // console.log('file', file, this.file[file])
      if (this.file.hasOwnProperty(file) && this.file[file].input && this.file[file].input.value) {
        data.append(file, this.file[file].input.files[0])
      }
    }

    return data
  },

  isModified (field, value) {
    const initial = byString(this.info, field)

    if (typeof initial === 'number') {
      value = Number(value)
    }

    if (initial !== value) {
      // console.log('field', field, typeof value, value)
      return true
    } else {
      return false
    }
  }
}

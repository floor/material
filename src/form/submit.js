export default {

  submit (ev) {
    ev.preventDefault()
    // console.log('submit', this.mode)

    var data = this.initData()

    // console.log('data', data)

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
  }
}

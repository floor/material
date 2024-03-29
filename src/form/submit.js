export default {

  submit (ev) {
    ev.preventDefault()
    // console.log('submit', this.mode)

    const data = this.initData()

    // console.log('data', data)

    if (this.update) {
      this.update(data)
    } else {
      this.setMethod(data)
    }

    return false
  },

  setMethod (formData) {
    let method = 'PUT'
    if (this.mode === 'create') {
      method = 'POST'
    }

    if (this.fetch) {
      // console.log('formData', formData.keys())
      this.fetch({
        method,
        formData
      })
    }

    if (this.action) {
      this.action({
        method,
        formData
      })
    }
  }
}

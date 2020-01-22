export default {
  fetch (option) {
    // console.log('fetch', this.options.route, option.method)
    fetch(this.options.route, {
      method: option.method,
      body: option.formData
    }).then(r => r.json()).then(info => {
      if (info.error) {
        // console.log('Error: ' + info.error)
        if (this.error) {
          this.error(info)
        }
      } else {
        // console.log('updated', info, this.mode)
        if (this.mode === 'create') {
          this.emit('created', info)
          this.mode = 'read'
        } else {
          this.info = info
          this.emit('updated', info)
          this.mode = 'read'
        }

        if (this.success) {
          this.success(info)
        }
      }
    })
  }
}

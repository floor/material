export default {
  update (data, options) {
    // console.log('update', data, options)
    options = options || {}

    // console.log('mode', this.mode)
    var method = options.method ||
        this.options[this.mode].method ||
        'put'

    var action = options.action ||
        this.options[this.mode].action ||
        this.options.action

    fetch(action, {
      method: method,
      body: data
    }).then(r => r.json()).then(info => {
      if (info.error) {
        console.log('Error: ' + info.error)
        if (this.error) {
          this.error(info)
        }
      } else {
        // console.log('updated', info)
        if (this.mode === 'create') {
          this.emit('created', info)
          this.setMode('read')
        } else {
          this.emit('updated', info)
          this.setMode('read')
        }

        this.info = info
      }
    })
  }
}

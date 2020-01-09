export default {
  set (id) {
    // console.log('set', id)
    if (!id) return

    this.emit('set', id)

    this.setMode('read')
    // this.render(info)
    fetch(this.options.action + id, {
      headers: {
        'Accept': 'application/json'
      },
      method: 'GET'
    }).then((resp) => {
      // console.log('resp', resp)
      return resp.json()
    }).then((info) => {
      console.log('info', info)
      this.info = info
      this.render(info)
      this.emit('setted', info)
    })
  }
}

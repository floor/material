export default {
  send (data) {
    console.log('send', data)
    var header = this.options.headers || {}

    fetch(this.options.form.action, {
      method: this.options.form.method,
      headers: header,
      body: JSON.stringify(data)
    }).then((resp) => {
      return resp.json()
    }).then((data) => {
      console.log(data)
      if (data.error) {
        if (this.error) this.error(data)
      } else {
        if (this.success) this.success(data)
      }
    })
  }
}

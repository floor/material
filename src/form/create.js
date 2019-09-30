
export default {

  create (info) {
  	console.log('create', info, this.info)
  	this.form.style.display = 'flex'

    this.setMode('create')
    this.render(this.options.create, 'create')
    this.ui.cancel.enable()
    // this.ui.submit.enable()
  }
}

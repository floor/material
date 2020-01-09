
export default {

  create () {
    console.log('create')

    var info = this.options.create.info || { name: 'New Item' }

    this.render(info, 'create')
    this.setMode('create')
    this.enableControls()
  }
}

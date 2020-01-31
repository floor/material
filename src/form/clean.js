
export default {
  clean (id) {
	// console.log('clean')
    for (var member in this.info) delete this.info[member]
    this.form.reset()
  }
}

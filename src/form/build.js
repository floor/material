import Layout from '../layout'

export default {
  build () {
    // console.log('build', this.options.layout)
    this.root = document.createElement('div')
    this.root.classList.add('form-view')

    this.form = document.createElement('form')
    this.root.appendChild(this.form)

    this.buildLayout()
  },

  buildLayout () {
    // console.log('buildLayout')
    this.form.innerHTML = ''
    this.layout = new Layout(this.options.layout, this.form)
    this.ui = this.layout.component

    this.extractInfo(this.ui)
    this.extractFile(this.ui)
    // console.log('file', this.file)

    this.ui.submit.disable()
    this.ui.cancel.disable()

    // console.log('ui', this.ui)
  },

  extractFile (object) {
    this.file = {}

    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        var files = property.split(/\./)
        if (files[0] === 'file' && files[1] !== undefined) {
          var name = property.substr(5, property.length)

          this.file[name] = object[property]
        }
      }
    }
  },

  extractInfo (object) {
    // console.log('extractField', object)

    this.field = {}

    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        var infos = property.split(/\./)

        if (infos[0] === 'info' && infos[1] !== undefined) {
          var name = property.substr(5, property.length)
          // console.log('field', name, property)

          this.field[name] = object[property]
        }
      }
    }
  }
}

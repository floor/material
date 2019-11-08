import Layout from '../layout'

export default {
  build () {
    // console.log('build', this.options.layout)
    this.root = document.createElement('div')
    this.root.classList.add('form')

    if (this.options.class !== 'form') {
      this.root.classList.add(this.options.class)
    }

    this.form = document.createElement('form')
    this.root.appendChild(this.form)

    this.buildLayout()

    console.log('options container', this.options.container)
    if (this.options.container) {
      this.options.container.appendChild(this.root)

      console.log('form', this.root)
    }
  },

  buildLayout () {
    // console.log('buildLayout')
    this.form.innerHTML = ''
    this.layout = new Layout(this.options.layout, this.form)
    this.ui = this.layout.component

    this.extractInfo(this.ui)
    this.extractFile(this.ui)
    console.log('field', this.field)
    // console.log('file', this.file)

    if (this.disableControl) {
      this.disableControl()
    }
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

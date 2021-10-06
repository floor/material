import isTouch from '../module/touchscreen'

export default {
  mouseUp (event) {
    // console.log('mouseup', event.target)
    if (this.clickSelect || !this.slide.classList.contains('dragging')) {
      if (event.target.classList.contains('empty')) { return }

      event.preventDefault()
      event.target.classList.remove('dragging')

      if (event.target.dataset.island !== undefined) {
        this.selectIsland(event.target)
      }

      if (event.target.parentNode.dataset.isocode !== undefined) {
        this.select(event.target.parentNode.dataset.isocode, event.target.parentNode)
      }
    }
  },

  mouseDown (event) {
    // if (isTouch()) return
    // console.log('mouseup', this.clickSelect)
    this.clickSelect = true
    this.clickTimeOut = setTimeout(() => {
      this.clickSelect = false
    }, 200)
  },

  mouseMove (event) {
    // console.log('over', event.relatedTarget, event.clientX, event.clientY)
    if (event.target.parentNode.dataset.isocode !== undefined) {
      // console.log('enter', event.clientX, event.clientY)
      this.label.innerHTML = this.country[event.target.parentNode.dataset.isocode]
      if (!isTouch()) {
        this.label.style.left = (event.clientX - 24) + 'px'
        this.label.style.top = (event.clientY - 36) + 'px'
      }
      this.label.classList.add('show')
    } else if (event.target.dataset.island !== undefined) {
      this.label.innerHTML = event.target.dataset.island
      this.label.style.left = (event.clientX - 24) + 'px'
      this.label.style.top = (event.clientY - 36) + 'px'
      this.label.classList.add('show')
    } else {
      this.label.innerHTML = ''
      this.label.classList.remove('show')
    }
  },

  mouseLeave () {
    this.label.innerHTML = ''
    this.label.classList.remove('show')
  },

  mouseOut () {
    this.label.innerHTML = ''
    this.label.classList.remove('show')
  },

  mouseClick (event) {
    event.preventDefault()
  }
}

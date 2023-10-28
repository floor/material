import insert from '../element/insert'
import offset from '../element/offset'

const defaults = {
  transition: '.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
  opacity: ['1', '.3']
}

function init (container) {
  console.log('set', container)
  container.addEventListener('mousedown', (e) => {
    console.log('mousedown')
    show(e)
  })
}

function show (e) {
  console.log('show', e)
  var container = e.target
  var offs = offset(container)

  let ripple = document.createElement('div')
  ripple.classList.add('ripple')
  let end = coordinate(offs)
  let initial = {
    left: (e.offsetX || offs.width / 2) + 'px',
    top: (e.offsetY || offs.height / 2) + 'px'
  }

  ripple.style.left = initial.left
  ripple.style.top = initial.top
  // ripple.style.opacity = defaults.opacity[1]
  ripple.style.transition = defaults.transition

  insert(ripple, container, 'top')

  setTimeout(() => {
    // console.log('style coord', end);
    ripple.style.left = end.left
    ripple.style.top = end.top
    ripple.style.width = end.size
    ripple.style.height = end.size
    // ripple.style.opacity = defaults.opacity[1]
  }, 1)

  document.body.onmouseup = () => {
    destroy(ripple)
  }
}

function coordinate (o) {
  var size = o.height
  var top = -o.height / 2

  if (o.width > o.height) {
    top = -(o.width - o.height / 2)
    size = o.width
  }

  return {
    size: (size * 2) + 'px',
    top: top + 'px',
    left: (size / -2) + 'px'
  }
}

function destroy (ripple) {
  if (ripple.parentNode) { ripple.style.opacity = '0' }

  document.body.onmouseup = null

  setTimeout(() => {
    if (ripple.parentNode) { ripple.parentNode.removeChild(ripple) }
  }, 1000)
}

export default init

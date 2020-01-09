
function viewport (el) {
  if (!el) return

  var rect = el.getBoundingClientRect()

  var top = rect.top
  var left = rect.left
  var width = rect.width
  var height = rect.height

  return (
    top >= window.pageYOffset &&
    left >= window.pageXOffset &&
    (top + height) <= (window.pageYOffset + window.innerHeight) &&
    (left + width) <= (window.pageXOffset + window.innerWidth)
  )
}

export default viewport


function viewport (el) {
  if (!el) return

  const rect = el.getBoundingClientRect()

  const top = rect.top
  const left = rect.left
  const width = rect.width
  const height = rect.height

  return (
    top >= window.pageYOffset &&
    left >= window.pageXOffset &&
    (top + height) <= (window.pageYOffset + window.innerHeight) &&
    (left + width) <= (window.pageXOffset + window.innerWidth)
  )
}

export default viewport

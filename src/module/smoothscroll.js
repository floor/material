function smoothscroll (e, top, time) {
  // console.log('smoothscroll', top, e.scrollTop)

  var start = top - e.scrollTop

  time = time || 275
  var step = start / 100
  var current = 0
  while (current <= time) {
    window.setTimeout(scrolling, current, e, step)
    current += time / 100
  }
}

function scrolling (e, step) {
  // console.log('scrolling', step, e.scrollTop)
  e.scrollBy(0, step)
}

export default smoothscroll

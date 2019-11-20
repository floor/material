
function passive () {
  var supportsPassive = false
  try {
    var opts = Object.defineProperty({}, 'passive', {
      get: function () {
        supportsPassive = true
      }
    })
    window.addEventListener('testPassive', null, opts)
    window.removeEventListener('testPassive', null, opts)
  } catch (e) {}

  return supportsPassive
}

export default passive

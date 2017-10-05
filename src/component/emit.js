/**
 * [emit description]
 * @param  {[type]} component [description]
 * @param  {[type]} event     [description]
 * @return {[type]}           [description]
 */
function emit(component, event /* , args... */ ) {
  // console.log('emit', component, event)
  component.event = component.event || {}
  if (event in component.event === false) return
  for (var i = 0; i < component.event[event].length; i++) {
    component.event[event][i].apply(component, Array.prototype.slice.call(arguments, 1))
  }
  return component
}

export default emit
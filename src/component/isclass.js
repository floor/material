function isClass(F) {
  try {
    var object = new F()
  } catch (err) {
    // verify err is the expected error and then
    return false
  }
  return object
}

export default isClass
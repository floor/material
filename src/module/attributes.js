const special = ['required', 'disabled', 'multiple', 'checked']

function attributes (element, o) {
  // console.log('attributes', o.attributes, element)

  if (!element) return

  for (let i = 0; i < o.attributes.length; i++) {
    const attribute = o.attributes[i]

    if (o[attribute] && o[attribute] !== 'undefined') {
      if (special.indexOf(attribute) > -1) {
        element.setAttribute(attribute, attribute)
      } else {
        element.setAttribute(attribute, o[attribute])
      }
    }
  }
}

export default attributes

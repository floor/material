const special = ['required', 'disabled', 'multiple', 'checked']

const attributes = (element, options) => {
  if (!element || !options.attributes) return

  options.attributes.forEach(attribute => {
    if (options[attribute] && String(options[attribute]) !== 'undefined') {
      const value = special.includes(attribute) ? attribute : options[attribute]
      element.setAttribute(attribute, value)
    }
  })
}

export default attributes

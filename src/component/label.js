import create from '../element/create'
import insert from '../element/insert'

const prefix = 'material'

/**
 * [initLabel description]
 * @return {?} [description]
 */
function label (wrapper, text, options) {
  text = text || null

  var prefix = options.class || options.prefix

  var label = create('label', prefix + '-label')
  label.textContent = text

  insert(label, wrapper)

  return label
}

export default label

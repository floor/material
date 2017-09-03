import attribute from './attribute';
import create from './create';
import insert from './insert';

function build(options, container, object, level) {
  level++;
  object = object || {};

  var element = create(options[1], options[2]);
  attribute.init(element, options[3]);
  object[options[0]] = element;
  insert(element, container);


  if (options[4] && options[4].length > 0) {
    //console.log('children', element, options[4].length, options[4]);
    for (var i = 0; i < options[4].length; i++) {
      var arr = options[4][i];

      if (arr)
        build(arr, element, object, level);
    }
  }

  return object;
}

export default build;
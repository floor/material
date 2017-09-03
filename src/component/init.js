import controller from './controller';

function init(instance) {
  var options = instance.options;

  // assign modules
  modules(instance);

  // to be removed
  instance.class = options.class;
  instance.name = options.name;

  controller.register(instance);

  return instance;
}


function modules(instance) {
  var modules = instance.options.modules;

  for (var i = 0; i < modules.length; i++) {
    Object.assign(instance, modules[i]);
  }
}

export default init;
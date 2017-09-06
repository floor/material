import controller from './controller';

function init(instance) {
  var options = instance.options;

  // assign modules
  modules(instance);

  controller.register(instance);

  return instance;
}

function modules(instance) {
  var modules = instance.options.modules;

  for (var i = 0; i < modules.length; i++) {
    if (typeof modules[i] === 'function') {
      modules[i](instance);
    } else {
      Object.assign(instance, modules[i]);
    }
  }
}

export default init;
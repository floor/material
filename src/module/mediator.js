const mediator = ((() => {
  /**
   * @description Subscribe to an event, supply a callback to be executed when that event is broadcast
   * @param store {string}
   * @param fn {function}
   * @returns {subscribe} {object}
   */
  const subscribe = function (store, fn) {
    if (!mediator.stores[store]) {
      mediator.stores[store] = []
    }

    mediator.stores[store].push({
      context: this,
      callback: fn
    })

    return this
  }

  /**
   * @description Publish/broadcast an event to the rest of the application
   * @param store {string}
   * @param args {object}
   * @returns {*||boolean}
   */
  const publish = function (store, ...args) {
    // console.log('publish', store, args)
    if (!mediator.stores[store]) {
      return false
    }

    for (let value of mediator.stores[store]) {
      const subscription = value
      subscription.callback.apply(subscription.context, args)
    }

    return this
  }

  return {
    stores: {},
    publish,
    subscribe,
    installTo: function (obj) {
      obj.subscribe = subscribe
      obj.publish = publish
    },
    init: function (obj) {
      obj.subscribe = subscribe
      obj.publish = publish
    }
  }
})())

export default mediator

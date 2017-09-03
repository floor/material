'use strict';

/**
 * 
 */
var controller = {


  /**
   * [register description]
   * @param  {component} component [description]
   * @return {Object} The class instance
   */
  register(instance, group) {
    group = group || 'component';
    this[group + 's'] = this[group + 's'] || [];
    this[group] = this[group] || {};
    //console.log('register', component.class);
    this[group + 's'].push(instance);

    this[group][instance.name] = this[group][instance.name] || [];

    this[group][instance.name].push(instance);

    return this;
  },

  /**
   * [sunscribe description]
   * @param  {[type]}   topic    [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  subscribe(topic, callback) {
    this._topics = this._topics || {};

    //_log.debug('subscribe', topic);
    if (!this._topics.hasOwnProperty(topic)) {
      this._topics[topic] = [];
    }

    this._topics[topic].push(callback);
    return true;
  },

  /**
   * [unsunscribe description]
   * @param  {[type]}   topic    [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  unsunscribe(topic, callback) {
    this._topics = this._topics || {};
    //_log.debug('unsubscribe', topic);
    if (!this._topics.hasOwnProperty(topic)) {
      return false;
    }

    for (var i = 0, len = this._topics[topic].length; i < len; i++) {
      if (this._topics[topic][i] === callback) {
        this._topics[topic].splice(i, 1);
        return true;
      }
    }

    return false;
  },

  /**
   * [publish description]
   * @return {[type]} [description]
   */
  publish() {
    this._topics = this._topics || {};

    var args = Array.prototype.slice.call(arguments);
    var topic = args.shift();
    //_log.debug('publish', topic);
    if (!this._topics.hasOwnProperty(topic)) {
      return false;
    }

    for (var i = 0, len = this._topics[topic].length; i < len; i++) {
      this._topics[topic][i].apply(undefined, args);
    }
    return true;
  },


  // setSettings(key, value) {
  //   var text = Cookies.get(key);

  //   var current = {};

  //   if (text) {
  //     current = JSON.parse(text);
  //   }

  //   console.log('settings value', current, value);
  //   //settings = [settings, value].reduce(Object.assign, {});
  //   var settings = merge(current, value);

  //   console.log('settings ' + key, settings);

  //   Cookies.set(key, JSON.stringify(settings));

  // }

  // getSettings(key) {
  //   var json = Cookies.get(key);

  //   if (!json) {
  //     return null;
  //   }
  //   var value = JSON.parse(json);

  //   console.log('settings' + key, value);

  //   return value;

  // }


};

export default controller;
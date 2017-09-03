'use strict';
/**
 * Mediator Object
 * @module mediator
 * @author Jerome Vial, Bruno Santos
 * @see heavily inspired https://carldanley.com/js-mediator-pattern/
 */


export default {

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
  }

};
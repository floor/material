
/**
 * control class
 *
 * @class control
 */
"use strict"

var prime = require("prime/index"),
    Component = require('./component'),
    Options = require('prime-util/prime/options'),
    Emitter = require("prime/emitter"),
    bind = require('./module/bind'),
    merge = require("deepmerge"),
    $ = require("elements");
    __debug = require('./module/debug');
   
var _log = __debug('material:control');

var Control = prime({
    inherits: Component,
    mixin: [Options, Emitter, bind],

    options: {
        //disabled: false
        error: false,
        bind: {
            'element.click': 'emit.click',
            'element.mouseup': 'emit.mouseup'
        }
    },

    constructor: function(options) {
        options = merge(Component.parent.options, options);
        this.setOptions(options);

        this.init();

        return this;
    },


    /**
     * [init description]
     * @return {void} [description]
     */
    init: function() {
        Control.parent.init.call(this);

        var opts = this.options;

        this.value = opts.value;
        this.readonly = opts.read;

        this.disabled = this.options.disabled;
    },

    /**
     * [isEnable description]
     * @return {boolean}
     */
    isEnable: function() {
        //_log.debug(this.state)
        if (this.state === 'disabled') {
            return false;
        } else {
            return true;
        }
    }
});

module.exports = Control;

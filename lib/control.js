
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
        // bind: {
        //     'element.click': 'emit.click'
        // }
    },

    constructor: function(options) {
        options = merge(Container.parent.options, options);
        this.setOptions(options);


        return this;
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
    },

    /**
     * [isActive description]
     * @return {boolean} [description]
     */
    isActive: function() {
        if (this.state === 'active') {
            return true;
        } else {
            return false;
        }
    },


    /**
     * [_initOptions description]
     * @return {void} [description]
     */
    _initOptions: function() {
        Control.parent._initOptions.call(this);

        var opts = this.options;

        this.value = opts.value;
        this.readonly = opts.read;
    },

    /**
     * [_initEvents description]
     * @return {void} [description]
     */
    _initEvents: function() {
        var self = this;

        //this.element.set('tabindex', 0);

        this.element.on({
            /**
             * @ignore
             */
            click: function(e) {
                _log.debug('click', e);
                //e.stopPropagation();
                self.emit('click');
            },

            /**
             * @ignore
             */
            mouseup: function() {
                self.emit('mouseup');
            }
        });
    }
});

module.exports = Control;
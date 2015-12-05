'use strict';



var Component = require('./component');
var bind = require('./module/bind');

var defaults = {
    //disabled: false
    error: false,
    binding: {
        'element.click': 'emit.click',
        'element.mouseup': 'emit.mouseup'
    }
};

var __debug = require('./module/debug'); 
var _log = __debug('material:control');

/**
 * control class
 *
 * @class
 */
class Control extends Component {

    constructor(options) {

        this.init(options);

        return this;
    }

    /**
     * [init description]
     * @return {void} [description]
     */
    init(options) {
        super.init(options);

        var opts = this.options;

        this.value = opts.value;
        this.readonly = opts.read;

        this.disabled = this.options.disabled;
    }

    build() {
        super.build();
    }

    /**
     * [isEnable description]
     * @return {boolean}
     */
    isEnable() {
        //_log.debug(this.state)
        if (this.state === 'disabled') {
            return false;
        } else {
            return true;
        }
    }
}

module.exports = Control;

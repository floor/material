'use strict';

var Component = require('./component');
var bind = require('./module/bind');

var defaults = {
    //disabled: false
    error: false,
    bind: {
        'element.click': 'emit.click',
        'element.mouseup': 'emit.mouseup'
    }
};

/**
 * control class
 *
 * @class
 */
class Control extends Component {

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

    /**
     * [isEnable description]
     * @return {boolean}
     */
    isEnable() {
        if (this.state === 'disabled') {
            return false;
        } else {
            return true;
        }
    }
}

module.exports = Control;

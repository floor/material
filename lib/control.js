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
     * Setter
     * @param {string} prop
     * @param {string} value
     */
    set(prop, value) {

        switch(prop) {
            case 'value':
                this.setValue(value);
                break;
            default:
                this.setValue(value);

        }

        return this;
    }

    /**
     * Getter
     * @param {string} prop
     * @param {string} value
     */
    get(prop) {
        var value;

        switch(prop) {
            case 'value':
                value = this.getValue(prop);
                break;
            default: 
                return this.getValue(prop);
        }

        return value;
    }

    /**
     * [getValue description]
     * @return {instance} The class instance
     */
    getValue(){
        return this.input.get('value');
    }

    /**
     * [setValue description]
     * @param {string} value [description]
     */
    setValue(value){
        this.input.attribute('value', value);
        this.emit('change', value);
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

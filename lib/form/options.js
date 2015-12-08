
/**
 * Form options
 * @type {Object} The default Form options
 */
var options = {
	name: 'form',
	lib: 'ui',
	base: 'view',
	prefix: 'ui-',
	tag: 'div',
	bind: {
		'change': '_viewDidChange',
		'submit': ['_onSubmit']
	}
};

module.exports = options;
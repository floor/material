
/**
 * Form options
 */
module.exports = {
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


/**
 * [defaults description]
 * @type {Object}
 */
var options = {
	name: 'list',
	lib: 'ui',
	base: 'view',
	prefix: 'ui-',

	comp:['body'],  

	binding: {
		'add': 'new',
		'infoedit': '_editInfo',
		'trash': '_viewDidTrash',
		"content.click:relay('div')": '_onClickElement',
		'content.dblclick:relay("div.ui-item")': '_onDblClickElement',
		'sort': 'reverse',
		'resize': '_updateSize',
		'search': 'toggleSearch',
	}
};

module.exports = options;
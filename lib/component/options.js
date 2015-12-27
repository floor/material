'use strict';

/**
 * Component options
 */
var options = {
	name: 'component',
	prefix: 'ui',
	type: null,	
	element: {
		lib: 'ui',
		prefix: 'ui',
		name: 'element',
		tag: 'span',
		type: null,
		attr: ['accesskey', 'class', 'contenteditable', 'contextmenu',
		'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
		'spellcheck', 'style', 'tabindex', 'title', 'translate', 'type']
	},
	bind: {
		'element.click': 'emit.click',
		'element.dblclick': 'emit.dblclick',
		'element.mousedown': 'emit.mousedown',
		'element.mouseup': 'emit.mouseup',
		'element.mouseleave': 'emit.mouseleave',
		'element.mouseenter': 'emit.mouseenter',
		'element.blur': 'emit.blur',
		'element.focus': 'emit.focus'
	}
};

module.exports = options;
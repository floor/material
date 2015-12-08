
/**
 * Element options
 */
module.exports = {
	lib: 'ui',
	prefix: 'ui-',
	name: 'element',
	type: null,
	attr: ['accesskey', 'class', 'contenteditable', 'contextmenu',
	'dir', 'draggable', 'dropzone', 'hidden', 'id', 'lang',
	'spellcheck', 'style', 'tabindex', 'title', 'translate', 'type'],
	binding: {
		'dom.click': 'emit.click',
		'dom.dblclick': 'emit.dblclick',
		'dom.mousedown': 'emit.mousedown',
		'dom.mouseup': 'emit.mouseup',
		'dom.mouseleave': 'emit.mouseleave',
		'dom.mouseenter': 'emit.mouseenter',
		'dom.blur': 'emit.blur',
		'dom.focus': 'emit.focus'
	}
};

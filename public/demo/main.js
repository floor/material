
var prime = require('prime'),
	domready = require('elements/domready');

var Component = require('../../lib/component.js');
var Container = require('../../lib/container.js');
var Layout = require('../../lib/layout.js');
var Button = require('../../lib/control/button.js');
var Field = require('../../lib/control/field.js');

domready(function() {
	console.log('ready', document.body);

	var container = new Container().inject(document.body);

	console.log('container', container);

	var layout = new Layout({
		container: container,
		node: {
			_name: 'standard',
			_list: ['navi', 'main', 'side'],
			main: {
				flex: '1'
			},
			navi: {
				size: 280,
				theme: 'dark'
			}
		}
	});
	
	console.log('layout', layout);

	var button = new Button({
		//type: 'action',
		label: 'one'
	}).inject(layout.navi);

	var button2 = new Button({
		type: 'raised',
		primary: true,
		label: 'two',
		klass: 'is-primary'
	}).inject(layout.navi);

	var button3 = new Button({
		type: 'raised',
		label: 'two',
	}).inject(layout.navi);

	button.on('press', function(e) {
		console.log('press', e);
		var field = new Field({
			name: 'field'
		}).inject(layout.main);
	});


	

	
});

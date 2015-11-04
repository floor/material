
var prime = require('prime'),
	ready = require('elements/domready');

var Component = require('../../lib/component.js');
var Container = require('../../lib/container.js');
var Layout = require('../../lib/layout/layout.js');
var Button = require('../../lib/control/button.js');

ready(function() {
	console.log('ready', document.body);

	var layout = new Layout({
		container: document.body
	});

	var component = new Component().inject(document.body);
	var button = new Button({
		type: 'action',
		klass: 'is-primary'
	}).inject(document.body);

	var container = new Container().inject(document.body);
});

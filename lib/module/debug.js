/**
 * bind module
 *
 * @class module/bind
 * @author Jerome Vial, Bruno Santos
 */
"use strict"

var Logger = require('../../dist/vendor/js-logger/src/logger.min.js');

/*handle browser without console*/
var console = console || {
    log: function() {}
};

/*define global _log*/
window._log = {
	debug: window.console.info.bind(window.console, '%s'),
	info: window.console.info.bind(window.console, '%s'),
	warn: window.console.warn.bind(window.console, '%s'),
	error: window.console.error.bind(window.console, '%s'),
	fatal: window.console.error.bind(window.console, '%s'),
};

/*use default settings for logger*/
Logger.useDefaults();

/*define global __debug*/
var debug = window.__debug = function(what) {

	what = what || 'minimal';

	var logger = Logger.get(what);

	logger.setLevel(Logger.WARN);

	logger.warn = window.console.warn.bind(window.console, '[' + what + '] %s');
	logger.error = window.console.error.bind(window.console, '[' + what + '] %s');
	logger.fatal = window.console.error.bind(window.console, '[' + what + '] %s');

	logger.defineLevel = function(level) {
		Logger.get(what).setLevel(Logger[level]);
	};

	return logger;

};

/*bind _log with console*/
function setDebug(isDebug, what) {
	if (isDebug) {
		what = {
			debug: window.console.info.bind(window.console, '%s'),
			info: window.console.info.bind(window.console, '%s'),
			warn: window.console.warn.bind(window.console, '%s'),
			error: window.console.error.bind(window.console, '%s'),
			fatal: window.console.error.bind(window.console, '%s'),
		};
	} else {
		var __no_op = function() {};

		what = {
			debug: __no_op,
			info: __no_op,
			warn: __no_op,
			error: __no_op,
			fatal: __no_op
		};
	}
}

setDebug(true, window._log);

module.exports = debug;



/**
 * material demo
 * @type {[type]}
 */

var Logger = require('js-logger');
Logger.useDefaults();

var express = require('express');
var app = express();

var port = 3000;

app.use(express.compress());
app.use('/', express.static(__dirname + '/dist'));

Logger.info('dist', __dirname + '/dist');

app.listen(process.env.PORT || port);

Logger.info('app running on port', port);


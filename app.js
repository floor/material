
/**
 * app.js
 */

var express = require('express');
var app = express();

var port = 3000;

app.use(express.compress());
//app.use('/', express.static(__dirname + '/dist'));
app.use('/element', express.static(__dirname + '/dist/element'));
app.use('/demo', express.static(__dirname + '/dist/demo'));
app.use('/vendor', express.static(__dirname + '/dist/vendor'));
app.use('/reports', express.static(__dirname + '/dist/reports'));
app.use('/vendor', express.static(__dirname + '/dist/report'));
app.use('/skin', express.static(__dirname + '/dist/skin'));
app.use('/build', express.static(__dirname + '/build'));
app.use('/docs', express.static(__dirname + '/docs'));

console.info('dist', __dirname + '/dist');

app.listen(process.env.PORT || port);

console.info('app running on port', port);

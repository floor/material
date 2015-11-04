
var express = require('express');
var app = express();

app.use(express.compress());

app.use(express.static(__dirname + '/public'));
app.use('/lib', express.static(__dirname + '/lib'));
app.use('/vendor', express.static(__dirname + '/vendor'));
app.use('/prime', express.static(__dirname + '/node_modules/prime'));
app.use('/moot', express.static(__dirname + '/vendor/moot/src'));

app.listen(process.env.PORT || 3000);
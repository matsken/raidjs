var express = require('express'),
	vhost = require('vhost'),
	raid = require('./raid/raid.js');

var app = express();
	app.use(vhost("xamiemon.com", raid));
	app.use(vhost("localhost", raid));

module.exports = app;

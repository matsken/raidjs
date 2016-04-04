var express = require('express'),
	vhost = require('vhost'),
	raid = require('./raid/raid.js'),
	config = require("./config"),
	host = config.vhost;

var app = express();
	app.use(vhost(host, raid));
	app.use(vhost("localhost", raid));

module.exports = app;

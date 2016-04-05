var express = require('express'),
	vhost = require('vhost'),
	raid = require('./raid/raid.js');

var app = express();
    app.use(function(req, res, next) {
        if (!req.secure) {
            return res.redirect("https://" + (req.hostname || "localhost") + ":8443" + req.originalUrl);
        }
        next();
    });
	//app.use(vhost(hostname, raid));
	app.use(vhost("localhost", raid));

module.exports = app;

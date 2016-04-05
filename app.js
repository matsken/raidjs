var express = require('express'),
	vhost = require('vhost'),
    config = require("./config"),
	raid = require('./raid/raid.js');

var app = express();
app.use(function(req, res, next) {
    if (!req.secure) {
        return res.redirect("https://" + (req.hostname || "localhost") + ":8443" + req.originalUrl);
    }
    next();
});

config.vhost.forEach((host) => {
    app.use(vhost(host, raid));
});

module.exports = app;

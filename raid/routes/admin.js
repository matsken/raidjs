var express = require('express');
var router = express.Router();
var model = require("../model.js");
var config = require("../../config");
var User = model.User;
var Flow = model.Flow;
var us = require("underscore");

router.use(function(req, res, next) {
	if (req.session.user && req.session.user.isAdmin) {
		next();
	} else {
		res.redirect("back");
	}
});

router.get('/', function(req, res) {
	res.render("admin", {});
});

router.get("/editUser", function(req, res) {
	var name = req.query.name;
	var attr = req.query.attr;
	var val = req.query.val;
	if (name && attr && val) {
		var query = {};
		query[attr] = val;
		User.findOneAndUpdate({name: name}, query, function(err, user) {
			res.send("OK");
		});
	}
});

module.exports = router;
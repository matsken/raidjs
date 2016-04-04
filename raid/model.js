var mongoose = require("mongoose"),
	config = require("./config");
	us = require("underscore");
var uniqueValidator = require("mongoose-unique-validator");

var url = config.database.url;
mongoose.connect(url);
var db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", function() {
	console.log("Successfully connected");
});

var UserSchema = new mongoose.Schema({
	email: {type: String, unique: true, required: true},
	name: String,
	password: String,
	token: String,
	expires: Date,
	role: String,
	"class": String,
	verified: Boolean,
	isAdmin: Boolean,
	flow: Boolean
});
UserSchema.plugin(uniqueValidator);

var EventSchema = new mongoose.Schema({
	date: Date,
	title: String,
	comment: String,
	attendance: {},
	confirmed: Boolean
});

var FlowSchema = new mongoose.Schema({
	date: Date,
	role: String,
	list: [String],
	latest: Boolean,
	result: {}
});

var Event = exports.Event = mongoose.model("Event", EventSchema);
var User = exports.User = mongoose.model("User", UserSchema);
var Flow = exports.Flow = mongoose.model("Flow", FlowSchema);

exports.db = db;
exports.fetchFlow = function(latest, date, callback) {
	User.find({verified: true}, function(err, users) {
		if (err) {
			res.render("message", {message: err});
		}
		var query = {latest: latest};
		if (date) {
			query.date = date;
		}
		Flow.find(query, function(err, flows) {
			if (err) {
				res.render("message", {message: err});
			}
			var dps = [], tank = [], heal = [];
			for (var i = 0; i < flows.length; i++) {
				if (flows[i].role == "dps") {
					dps = flows[i].list;
				} else if (flows[i].role == "tank") {
					tank = flows[i].list;
				} else if (flows[i].role == "heal") {
					heal = flows[i].list;
				}
			}
			dps = us.filter(us.map(dps, function(d) {
				return us.findWhere(users, {id: d});
			}), function(u) {return !!u});
			heal = us.filter(us.map(heal, function(h) {
				return us.findWhere(users, {id: h});
			}), function(u) {return !!u});
			tank = us.filter(us.map(tank, function(t) {
				return us.findWhere(users, {id: t});
			}), function(u) {return !!u});
			var unassigned = us.difference(users, us.union(dps, heal, tank));
			callback(dps, heal, tank, unassigned);
		});
	});
};
var express = require('express');
var router = express.Router();
var model = require("../model.js");
var config = require("../../config");
var User = model.User,
	Flow = model.Flow,
	Event = model.Event;
var us = require("underscore");
var df = require("dateformat");

/* GET users listing. */
router.get('/', function(req, res) {
	fetch(true, null, function(dps, heal, tank) {
		res.render("flow", {dps: dps, tank: tank, heal: heal, date: "最新"});
	});
});

router.get("/manage", function(req, res) {
	fetch(true, null, function(dps, heal, tank, unassigned) {
		res.render("manageFlow", {data: {dps: dps, heal: heal, tank: tank}, users: unassigned});
	});
});

router.get("/clear", function(req, res) {
	Flow.remove({}, function(err) {
		Event.find({confirmed: true}, function(err, events) {
			us.each(events, function(evt) {
				evt.confirmed = false;
				evt.save();
			});
			res.render("message", {message: "cleared", error: err});
		});
	});
});

router.post("/update", function(req, res) {
	
});

router.post("/addUser", function(req, res) {
	var id = req.body.id;
	var role = req.body.role;
	if (role == "mdps" || role == "rdps") {
		role = "dps";
	}
	User.findOne({_id: id}, function(err, user) {
		handleError(err);
		user.flow = true;
		user.save();
		Flow.findOne({latest: true, role: role}, function(err, flow) {
			flow = flow || new Flow({
				role: role,
				date: new Date(),
				list: [],
				latest: true,
				result: {}
			});
			handleError(err);
			flow.list.push(user.id);
			flow.save(function(err) {
				handleError(err);
				res.redirect("/flow/manage");
			});
		});
	});
});

router.post("/up", function(req, res) {
	var id = req.body.id;
	var role = req.body.role;
	Flow.findOne({latest: true, role: role}, function(err, flow) {
		handleError(err);
		var idx = us.indexOf(flow.list, id);
		if (idx >= 1) {
			flow.list.splice(idx, 1);
			flow.list.splice(idx - 1, 0, id);
			flow.save(function(err) {
				handleError(err);
				res.redirect("/flow/manage");
			});
		} else {
			res.redirect("/flow/manage");
		}
	});
});
router.post("/down", function(req, res) {
	var id = req.body.id;
	var role = req.body.role;
	Flow.findOne({latest: true, role: role}, function(err, flow) {
		handleError(err);
		var idx = us.indexOf(flow.list, id);
		if (idx < flow.list.length - 1) {
			flow.list.splice(idx, 1);
			flow.list.splice(idx + 1, 0, id);
			flow.save(function(err) {
				handleError(err);
				res.redirect("/flow/manage");
			});
		} else {
			res.redirect("/flow/manage");
		}
	});
});
router.post("/deleteUser", function(req, res) {
	var id = req.body.id;
	var role = req.body.role;
	Flow.findOne({latest: true, role: role}, function(err, flow) {
		handleError(err);
		flow.list.splice(us.indexOf(flow.list, id), 1);
		flow.save(function(err) {
			handleError(err);
			res.redirect("/flow/manage");
		});
	});
	User.findOneAndUpdate({_id: id}, {flow: false}, null, function(res) {
		console.log("successfully removed flow user with id:" + id);
	});
});

router.get("/history", function(req, res) {
	history(function(userMap, flows) {
		var data = {};
		for (var i = 0; i < flows.length; i++) {
			var flow = flows[i];
			var date = df(flow.date, "yyyy/mm/dd");
			var roleData = {};
			var isEmpty = true;
			for (var uid in flow.result || {}) {
				if (userMap[uid] && userMap[uid].name) {
					roleData[userMap[uid].name] = {result: flow.result[uid], user: userMap[uid]};
				}
				isEmpty = false;
			}
			if (!isEmpty) {
				if (!data[date]) {
					data[date] = {dps: [], heal: [], tank: [], date: flow.date};
				}
				data[date][flow.role] = roleData;
			}
		}
		res.render("flowHistory", {data: data});
	});
});

router.get("/export", function(req, res) {
	history(function(userMap, flows) {
		var lines = [];
		var allUsers = {};
		var merged = {};
		var label = {"0": "出", "1": "欠", "2": "フ"};
		for (var i = 0; i < flows.length; i++) {
			var flow = flows[i];
			var result = flow.result || {};
			if (merged[flow.date]) {
				merged[flow.date] = us.extend(merged[flow.date], result);
			} else {
				merged[flow.date] = result;
			}
			for (uid in result) {
				allUsers[uid] = userMap[uid] || "Unknown";
			}
		}
		var users = ["Date"];
		for (var uid in allUsers) {
			users.push(allUsers[uid].name);
		}
		lines.push(users.join(","));
		for (var date in merged) {
			var result = merged[date];
			var line = [df(date, "yyyy/mm/dd")];
			for (var uid in allUsers) {
				line.push(label[result[uid]]);
			}
			lines.push(line.join(","));
		}
		var data = lines.join("\n");
		
		res.set("Content-Type", "text/csv");
		res.set("Content-Disposition", "attachment; filename='flow.csv'");
		res.send(data);
	});
});

router.get("/undo", function(req, res) {
	Flow.find({latest: true}, function(err, toDelete) {
		var delDate;
		us.map(toDelete, function(del) {
			del.remove();
			delDate = del.date;
		});
		Event.findOneAndUpdate({date: delDate, confirmed: true}, {confirmed: false}, function(err) {
			if (err) {
				console.log(err);
			}
		});
		Flow.find({latest: false}).sort("-date").exec(function(err, flows) {
			for (var i = 0; i < flows.length && i < 3; i++) {
				flows[i].latest = true;
				flows[i].save();
			}
			fetch(true, null, function(dps, heal, tank) {
				res.render("flow", {dps: dps, tank: tank, heal: heal, date: "最新"});
			});
		});
	});
});

function history(callback) {
	User.find({}, function(err, users) {
		var userMap = {};
		users.forEach(function(user) {
			userMap[user._id] = user;
		});
		Flow.find({latest: false}).sort("-date").exec(function(err, flows) {
			callback(userMap, flows);
		});
	});
}

router.get("/history/:date", function(req, res) {
	var date = new Date(req.params.date - 0);
	fetch(false, date, function(dps, heal, tank) {
		res.render("flow", {dps:dps, heal:heal, tank:tank, date: df(date, "yyyy/mm/dd")});
	});
});

function handleError(err) {
	if (err) {
		res.render("message", {message: err});
	}
}

function fetch(latest, date, callback) {
	model.fetchFlow(latest, date, callback);
}

module.exports = router;
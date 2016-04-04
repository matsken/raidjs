var express = require('express');
var router = express.Router();
var model = require("../model.js");
var Event = model.Event;
var config = require("../config");
var df = require("dateformat");
var User = model.User;
var Flow = model.Flow;
var us = require("underscore");

var days = "日月火水木金土";

/* GET users listing. */
router.get('/', function(req, res) {
	var week = 0;
	createWeekData(week, function(events) {
		User.find({verified: true, flow: true}).sort("name").exec(function(err, users) {
			res.render("events", {error :err, events: events, week: week, users: users});
		});
	});
});

router.get("/attend/:week", function(req, res) {
	createWeekData(req.params.week, function(events) {
		res.render("attend", {events: events, week: req.params.week});
	});
});

router.get("/adminAttend/:week", function(req, res) {
	createWeekData(req.params.week, function(events) {
		User.find({verified: true, flow: true}).sort("name").exec(function(err, users) {
			res.render("attend", {events: events, week: req.params.week, adminoverride: true, users: users});
		});
	});
});

router.post("/attend", function(req, res) {
	var d = req.body;
	var i = 0;
	var data = [];
	var user = d.user || req.session.user._id;
	
	while (typeof(d["date" + i]) != "undefined") {
		data.push({
			id: d["id" + i] || "",
			date: d["date" + i],
			comment: d["comment" + i] || "",
			choice: d["choice" + i] || "-"
		});
		i++;
	}
	var j = data.length;
	data.forEach(function(day) {
		i++;
		if (day.id) {
			Event.findOne({_id: day.id}, function(err, found) {
				if (err) {
					console.log(err);
				}
				found.attendance = us.extend({}, found.attendance);
				found.attendance[user] = {
					choice: day.choice,
					comment: day.comment
				};
				found.markModified("attendance");
				found.save(function(err){
					if (err) console.log(err);
					j--;
					if (j == 0) {
						res.redirect("/events/" + d.week);
					}
				});
			});
		} else {
			var obj = {
				date: new Date(day.date - 0),
				attendance: {}
			};
			obj.attendance[user] = {
				choice: day.choice,
				comment: day.comment
			};
			var newEvent = new Event(obj);
			newEvent.save(function(err){
				if (err) console.log(err);
				j--;
				if (j == 0) {
					res.redirect("/events/" + d.week);
				}
			});
		}
	});
});

router.get("/add/:date", function(req, res) {
	res.render("event", {event: {}, date: df(new Date(req.params.date - 0), "yyyy/mm/dd")});
});

router.get("/edit/:id", function(req, res) {
	Event.findOne({_id: req.params.id}, function(err, evt) {
		if (!evt) {
			console.log("event not found");
			res.redirect("/events");
		} else {
			res.render("event", {error: err, event: evt, date: df(evt.date, "yyyy/mm/dd")});
		}
	});
});

router.post("/save", function(req, res) {
	var date = new Date(req.body.date);
	var comment = req.body.comment;
	var title = req.body.title;
	var id = req.body.id;
	if (id) {
		Event.findOneAndUpdate({_id: id}, {comment: comment, title: title}, function(err, evt) {
			if (err) {
				res.render("event", {error: err, event: evt || {}});
			} else {
				res.redirect("/events");
			}
		});
	} else {
		var newEvent = new Event({
			title: title,
			comment: comment,
			date: date,
			attendance: {}
		});
		newEvent.save(function(err, evt) {
			if (err) {
				res.render("event", {error: err, event: evt || {}});
			} else {
				res.redirect("/events");
			}
		});
	}
});

router.get("/delete/:id", function(req, res) {
	Event.findOneAndRemove({_id: req.params.id}, function(err) {
	});
	res.redirect("/events");
});

router.get("/confirm/:id", function(req, res) {
	if (req.params.id == "0") {
		// no event yet
		res.redirect("back");
	} else {
		Event.findOne({_id: req.params.id}, function(err, event) {
			if (!event) {
				res.redirect("back");
			} else {
				model.fetchFlow(true, null, function(dps, heal, tank, unassigned) {
					var date = df(event.date, "yyyy/mm/dd");
					res.render("confirm", {error: err, date: date, event: event,
						data: {
							dps: dps,
							heal: heal,
							tank: tank
						}
					});
				});
			}
		});
	}
});

router.post("/confirm", function(req, res) {
	var evtId = req.body.id;
	Event.findOne({_id: evtId}, function(err, evt) {
		evt.comment = req.body.comment;
		evt.title = req.body.title;
		evt.confirmed = true;
		var evtDate = evt.date;
		evt.save(function(err) {
			if (err) {
				console.log(err);
			}
			Flow.find({latest: true}, function(err, flows) {
				var j = flows.length;
				var date = evtDate;
				flows.forEach(function(flow) {
					var list = flow.list;
					var newList = [];
					var flowList = [];
					var absents = {};
					var result = {};
					for (var i = 0; i < list.length; i++) {
						var uid = list[i];
						if (req.body[uid]) {
							var att = req.body[uid] - 0;
							if (att === 0) {		// attend
								newList.push(uid);
							} else if (att === 1) {	// absent
								absents[i] = uid;
							} else if (att === 2) {	// flow
								flowList.push(uid);
							}
						}
						result[uid] = att;
					}
					for (var i = 0; i < flowList.length; i++) {
						newList.push(flowList[i]);
					}
					for (var i in absents) {
						newList.splice(i, 0, absents[i]);
					}
					var newFlow = new Flow({
						date: date,
						role: flow.role,
						latest: false,
						list: flow.list,
						result: result
					});
					newFlow.save(function(err) {
						if (err) console.log(err);
						j--;
						if (j == 0) {
							res.redirect("back");
						}
					});
					flow.list = newList;
					flow.date = date;
					flow.save(function(err) {
						if (err) console.log(err);
					});
				});	
			});
		});
	});
});

router.get("/details/:id", function(req, res) {
	var id = req.params.id;
	Event.findOne({_id: id}, function(err, event) {
		event.attendance = event.attendance || {};
		var att = event.attendance;
		var data = {
			tank: [],
			heal: [],
			mdps: [],
			rdps: []
		}
		User.find({verified: true, flow: true}).sort("name").exec(function(err, users) {
			var rdpsa = 0, rdpsm = 0, mdpsa = 0, mdpsm = 0, heala = 0, healm = 0, tanka = 0, tankm = 0;
			us.each(users, function(user) {
				data[user.role].push(user);
				var attendance = 0;
				if (att[user._id]) {
					attendance = att[user._id].choice - 0;
				} else {
					att[user._id] = 0;
				}
				if (attendance === 1) {
					if (user.role == "rdps") {
						rdpsa++;
					} else if (user.role == "mdps") {
						mdpsa++;
					} else if (user.role == "heal") {
						heala++;
					} else if (user.role == "tank") {
						tanka++;
					}
				} else if (attendance === 2) {
					if (user.role == "rdps") {
						rdpsm++;
					} else if (user.role == "mdps") {
						mdpsm++;
					} else if (user.role == "heal") {
						healm++;
					} else if (user.role == "tank") {
						tankm++;
					}
				}
			});
			var total = tanka + heala + mdpsa + rdpsa;
			var total2 = total + tankm + healm + mdpsm + rdpsm;
			var counts = {
				tank: tanka + " (" + (tanka + tankm) + ")",
				heal: heala + " (" + (heala + healm) + ")",
				mdps: mdpsa + " (" + (mdpsa + mdpsm) + ")",
				rdps: rdpsa + " (" + (rdpsa + rdpsm) + ")",
				total: total + " (" + total2 + ")"
			};
			Flow.find({date: event.date, latest: false}, function(err, flows) {
				var flow = {};
				if (flows && flows.length > 0) {
					flows.forEach(function(f) {
						flow[f.role] = f.result;
					});
				} else {
					flow = null;
				}
				res.render("eventDay", {data: data, counts: counts, error: err, event: event, date: df(event.date, "yyyy/mm/dd"), flow: flow});
			});
		});
	});
});

router.get("/clear", function(req, res) {
	res.redirect("/");
	return;
	Event.remove({}, function(err) {
		if (err) {
			console.log(err);
		}
		res.render("message", {message: "cleared"});
	});
});

router.get("/all", function(req, res) {
	Event.find({}, function(err, data) {
		res.send(data);
	});
});

router.get("/:week", function(req, res) {
	var week = req.params.week - 0;
	createWeekData(week, function(events) {
		User.find({verified: true, flow: true}).sort("name").exec(function(err, users) {
			res.render("events", {error :err, events: events, week: week, users: users});
		});
	});
});

function createWeekData(week, callback) {
	var startDate = getStartDate(week);
	var endDate = getEndDate(week);
	var curDate = new Date(startDate);
	var today = new Date();
	today.setMilliseconds(0);
	today.setSeconds(0);
	today.setMinutes(0);
	today.setHours(0);
	var events = [];
	
	Event.find({})
		.where("date").gte(startDate).lt(endDate)
		.sort("date")
		.exec(function(err, data) {
			for (var i = 0, j = 0; i < 7; i++) {
				var date = startDate.getTime() + 24 * 60 * 60 * 1000 * i;
				var curDate = new Date(date);
				var obj = {
					label: (parseInt(curDate.getMonth()) + 1) + "/" + curDate.getDate() + "(" + days[curDate.getDay()] + ")",
					date: curDate.getTime(),
					data: {}
				};
				if (today.getTime() == curDate.getTime()) {
					obj.today = true;
				}
				if (data[j] && data[j].date.getTime() == curDate.getTime()) {
					obj.data = data[j++];
				}
				events.push(obj);
			}
			callback(events);
		});
}

function getStartDate(week) {
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	today.setMilliseconds(0);

	var d = today.getDate();
	var day = today.getDay();
	day -= 2;	// set tues as start
	if (day < 0) {
		day += 7;
	}
	today.setDate(d - day + (7 * week));
	return today;
}

function getEndDate(week) {
	return getStartDate(week + 1);
}

module.exports = router;

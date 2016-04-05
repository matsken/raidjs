var express = require('express');
var router = express.Router();
var model = require("../model.js");
var config = require("../../config");
var User = model.User;
var Flow = model.Flow;
var pwhash = require("password-hash");
var us = require("underscore");
var request = require("request");

/* GET users listing. */
router.get('/', function(req, res) {
	User.find({}, function(err, users) {
		res.render("users", {error :err, users: users});	
	});
});

router.get("/ilvl", function(req, res) {
	var name = req.param("name");
	var url = "http://us.battle.net/api/wow/character/proudmoore/" + name + "?fields=items";
	
	var parts = [
		"head",
		"neck",
		"shoulder",
		"back",
		"chest",
		"wrist",
		"hands",
		"waist",
		"legs",
		"feet",
		"finger1",
		"finger2",
		"trinket1",
		"trinket2",
		"mainHand",
		"offHand"
	];
	request({url: url, json: true}, function(err, resp, body) {
		var ilvl = "";
		if (body && body.items) {
			ilvl = body.items.averageItemLevelEquipped;
		}
		var subNorm = 0, subHero = 0, subMyth = 0, pvp = false;
		us.each(parts, function(part) {
			var item = body.items[part];
			if (!item) {
				return;
			}
			var iname = item.name;
			var lv = item.itemLevel;
			// ignore pvp items
			if (iname.indexOf("Primal Gladiator") >= 0 || iname.indexOf("Primal Combatant") >= 0) {
				pvp = true;
			}
			if (lv < 695) {
				subNorm++;
			} else if (lv < 710) {
				subHero++;
			} else if (lv < 725) {
				subMyth++;
			}
		});
		res.send({average: ilvl, subNorm: subNorm, subHero: subHero, subMyth: subMyth, pvp: pvp});
	});
});

router.get("/all", function(req, res) {
	User.find({}, function(err, users) {
		res.send(users);
	});
});

router.get("/clear", function(req, res) {
	User.remove({}, function(err) {
		if (err) {
			console.log(err);
		}
		req.session.user = null;
		res.render("message", {message: "cleared"});
	});
});

router.get("/info", function(req, res) {
	res.render("userInfo", {});
});

router.get("/edit", function(req, res) {
	res.render("editUser", {});
});

router.post("/update", function(req, res) {
	var roleUpdate = false;
	User.findOne({_id: req.session.user._id}, function(err, user) {
		if (user.role != req.body.role) {
			var flowRole = user.role.indexOf("dps") > 0 ? "dps" : user.role;
			Flow.findOne({latest: true, role: flowRole}, function(err, flow) {
				if (!flow) return;
				var idx = us.indexOf(flow.list, user._id + "");
				if (idx > -1) {
					flow.list.splice(idx, 1);
					flow.save(function(err) {
						console.log("flow list updated");
					});
				}
			});
		}
		user.email = req.body.email;
		user.role = req.body.role;
		user["class"] = req.body["class"];
		user.name = req.body.name;
		user.save(function(err, u) {
			req.session.user = u;
			res.render("userInfo", {error: err});
		});
	});
});

router.get("/delete", function(req, res) {
	res.render("deleteUser", {});
});

router.get("/normalize", function(req, res) {
	User.find({}, function(err, users) {
		us.map(users, function(user) {
			user.name = user.name.charAt(0).toUpperCase() + user.name.slice(1);
			user.save();
		});
	});
	res.redirect("/users");
});

router.post("/delete", function(req, res) {
	var user = req.session.user;
	User.findOneAndRemove({_id: user._id}, function(err) {
	});
	var roles = {rdps: "dps", mdps: "dps", tank: "tank", heal: "heal"};
	Flow.find({latest: true, role: roles[user.role]}, function(err, flow) {
		if (flow && flow.list.indexOf(user._id) >= 0) {
			flow.list.splice(us.indexOf(flow.list, user._id), 1);
			flow.save(function(err) {
				console.log(err);
			});
		}
	});
	res.redirect("/logout");
});

router.get("/pass", function(req, res) {
	res.render("pwd", {});
});

router.post("/pass", function(req, res) {
	var oldPass = req.body.password;
	var newPass = req.body.newPassword;
	User.findOne({_id: req.session.user._id}, function(err, user) {
		if (pwhash.verify(oldPass, user.password)) {
			user.password = pwhash.generate(newPass);
			user.save(function(err, u) {
				res.render("userInfo", {error: err});
			});
		} else {
			res.render("pwd", {error: "パスワードが不正です"});
		}
	});
});

router.post("/updateAdmin", function(req, res) {
	var cnt = 0;
	for (var id in req.body) {
		cnt++;
		if (id.indexOf("delete-") >= 0) {
			var delId = id.substring("delete-".length);
			User.remove({_id: delId}, function(err) {
				cnt--;
				if (cnt === 0) {
					res.redirect("/users");
				}
			});
		} else if (id.indexOf("name_") >= 0) {
			// update name
			uid = id.substring(5);
			User.findOneAndUpdate({_id:uid}, {name: req.body[id]}, function(err, doc) {
				cnt--;
				if (err) {
					console.log(err);
				}
				if (cnt === 0) {
					res.redirect("/users");
				}
			});
		} else {
			User.findOneAndUpdate({_id: id}, {isAdmin: req.body[id] == "on"}, function(err, doc) {
				cnt--;
				if (err) {
					console.log(err);
				}
				if (cnt === 0) {
					res.redirect("/users");
				}
			});
		}
	}
});

router.get("/deleteEmail/:email", function(req, res) {
	var addr = req.params.email;
	var loginUser = req.session.user;
	if (!loginUser.isAdmin) {
		return;
	}
	if (addr) {
		User.remove({email: addr}, function(err) {
			res.redirect("/users");
		});
	}
});

module.exports = router;

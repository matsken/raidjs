var model = require("../model.js"),
	config = require("../../config"),
	router = require('express').Router();
	fs = require('fs'),
	uuid = require('node-uuid'),
	User = model.User,
	email = require("../email"),
	pwhash = require("password-hash");
	
router.get("/", function(req, res) {
	res.render("register", {});
});

router.post("/", function(req, res) {
	var addr = req.body.email;
	if (!addr || !req.body.name || !req.body.password) {
		res.render("register", {error: "内容に不備があります"});
	}
	
	var code = req.body.code;
	if (code != config.passcode) {
		res.render("register", {error: "登録コードが違います"});
		return;
	}
	
	fs.readFile("raid/mailTemplate.html", "utf8", function(err, mailTemplate) {
		var token = uuid.v1();
		var params = req.body;
		var ts = (new Date()).getTime() + 48 * 60 * 60 * 1000;
		params.expires = new Date(ts);
		params.token = token;
		params.verified = false;
		params.password = pwhash.generate(params.password);	// encrypt password
		params.isAdmin = false;
		
		var newUser = new User(params);
		newUser.save(function(err) {
			if (err) {
				console.log(err);
				res.redirect("back");
			} else {
				var url = config.hostname + "/register/verify?token=" + token;
				var html = mailTemplate.replace("%url%", url).replace("%name%", req.body.name);
				email.send(addr, "CAVAG Raid ユーザー登録確認メール", html, function(response) {
					res.render("message", {message: "確認のメールを送りました。 48時間以内にメール本文中のURLをクリックして、登録を完了してください。"});
				});
			}
		});
	});
});

router.get("/verify", function(req, res) {
	var token = req.param("token");
	var now = (new Date()).getTime();
	User.find({"token": token}, function(err, data) {
		if (err) {
			console.log(err);
		}
		if (data && data[0]) {
			var userData = data[0];
			var expires = userData.expires.getTime();
			if (expires < now) {
				User.remove({token: token}, function(err) {
					if (err) {
						console.log(err);
					}
				});
				res.render("message", {message: "登録が完了しました。ログインしてください。"});
			} else {
				User.update({token: token}, {verified: true, token: "", expires: null}, function(err, num) {
					if (err) {
						console.log(err);
					}
					res.render("login", {message: "登録が完了しました。ログインしてください。"});
				});
			}
		} else {
			res.render("message", {message: "エラー"});
		}
	});
	
});

router.post("/reset", function(req, res) {
	var addr = req.body.email;
	User.findOne({email: addr}, function(err, user) {
		if (!user || user.length == 0) {
			res.render("forgot", {error: "登録されたアドレスではありません"});
		} else {
			fs.readFile("raid/resetTemplate.html", "utf8", function(err, resetTemplate) {				
				var token = uuid.v1();
				user.token = token;
				user.expires = new Date((new Date()).getTime() + 24 * 60 * 60 * 1000);
				user.save(function(err) {
					if (err) {
						console.log(err);
						res.redirect("back");
					} else {
						var url = config.hostname + "/register/reset/" + token;
						var html = resetTemplate.replace("%url%", url).replace("%name%", user.name);
						email.send(addr, "CAVAG Raid パスワードリセット", html, function(response) {
							res.render("message", {message: "パスワードのリセット手順を送付しました。"});
						});
					}
				});
			});
		}
	});
});

router.get("/reset/:token", function(req, res) {
	var token = req.params.token;
	User.findOne({token: token}, function(err, user) {
		var now = (new Date()).getTime();
		if (user && user.expires) {
			if (now > user.expires.getTime()) {
				res.send("リセットの期限が過ぎています。");
			} else {
				user.save(function(err) {
					res.render("reset", {error: err, token: user.token});
				});
			}
		} else {
			res.render("login", {error: "登録されたアドレスではありません"});
		}
	});
});

router.post("/pwd", function(req, res) {
	var pwd = pwhash.generate(req.body.password);
	var token = req.body.token;
	User.findOne({token: token}, function(err, user) {
		if (!user || user.length == 0) {
			res.render("login", {error: "エラー"});
		}
		user.password = pwd;
		user.token = "";
		user.verified = true;
		user.save(function(err) {
			res.render("login", {message: err ? "" : "パスワードが変更されました", error: err});
		});
	});
	
});

router.get("/forgot", function(req, res) {
	res.render("forgot", {});
});

module.exports = router;
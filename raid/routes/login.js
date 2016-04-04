var express = require("express"),
	config = require("../config"),
	pwhash = require("password-hash"),
	router = express.Router();


router.get("/", function(req, res) {
	if (req.session.user) {
		res.redirect("events");
	} else {
		res.render("login", {});
	}
});

router.post("/", function(req, res) {
	var email = req.body.email;
	var password = req.body.password;
	var persist = req.body.persist;
	
	if (email === config.adminuser && password === config.adminpass) {
		req.session.user = {name: email, isAdmin: true};
		res.redirect("/");
		return;
	}
	User.find({email: email}, function(err, data) {
		if (data && data[0]) {
			var storedUser = data[0];
			if (!storedUser.verified) {
				res.render("login", {error: "メールアドレスの確認が必要です。確認メールのURLをクリックして登録を完了してください。"});
				return;
			}
			var pw = pwhash.verify(password, storedUser.password);
			if (pw) {
				req.session.user = storedUser;
				res.redirect("/");
			} else {
				res.render("login", {error: "ユーザー名かパスワードが違います"});
			}
		} else {
			res.render("login", {error: "ユーザー登録をしてください"});
		}
	});
});

module.exports = router;
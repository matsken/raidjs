var jwt = require("jsonwebtoken"),
    ex = require("express"),
    model = require("../../model"),
    config = require("../../../config"),
	pwhash = require("password-hash"),
    router = ex.Router();
    
var User = model.User;

router.post("/", function(req, res) {
    console.log("Auth root");
    var email = req.body.email,
        password = req.body.password;
        
    User.findOne({
        email: email
    }, function(err, user) {
        if (err) {
            res.json({success: false, message: "Error", error: err});
        } else if (!user) {
            res.json({success: false, message: "User not found"});
        } else {
            var pw = pwhash.verify(password, user.password);
			if (pw) {
                var token = jwt.sign(user, config.jwt_secret, {
                    expiresInMinutes: 60 * 24 * 30
                });
                res.json({
                    success: true,
                    message: "Authenticated",
                    token: token
                });
			} else {
				res.json({success: false, message: "Authentication failed"});
			}
        }
    });
});

module.exports = router;
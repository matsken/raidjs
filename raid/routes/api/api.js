var express = require("express"),
    resource = require("express-resource"),
    jwt = require("jsonwebtoken"),
    model = require("../../model"),
    config = require("../../config"),
	pwhash = require("password-hash"),
    auth = require("./auth"),
    router = express.Router();

var User = model.User;

var security = function(req, res, next) {
    var token = req.body.token || req.query.token || req.header["x-access-token"];
    if (token) {
        jwt.verify(toen, config.jwt_secret, function(err, decoded) {
            if (err) {
                return res.json({success: false, message: err});
            } else {
                req.decoded = decoded;
                next();
            }
        });
    } else {
        return res.status(403).send({
            success: false,
            message: "No token"
        });
    }
};

router.post("/auth", function(req, res) {
    console.log("Auth root");
    var email = req.body.email,
        password = req.body.password;
        
    User.findOne({
        email: email
    }, function(err, user) {
        if (err) {
            res.json({success: false, message: "Error", error: error});
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

var init = function(app) {
    router.use(security);
    //app.resource("events", require("./api/event"), {id: "id"});
    return router;
};
   
module.exports = init;
var express = require("express"),
    resource = require("./resource"),
    jwt = require("jsonwebtoken"),
    model = require("../../model"),
    config = require("../../../config"),
	pwhash = require("password-hash"),
    auth = require("./auth"),
    router = express.Router();

var User = model.User;

var security = function(req, res, next) {
    var token = req.body.token || req.query.token || req.header("x-access-token");
    if (token) {
        jwt.verify(token, config.jwt_secret, function(err, decoded) {
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

var adminSecurity = function(req, res, next) {
    var user = req.decoded || {};
    if (user.isAdmin) {
        next();
    } else {
        res.status(403).json({success: false, message: "Not Authorized"});
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
                var token = jwt.sign(user.toJSON(), config.jwt_secret, {
                    expiresIn: 60 * 60 * 24 * 30
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

// filter to mask email and password
var userFilter = function(item) {
    item.email = "******" + item.email.substring(item.email.indexOf("@"));
    item.password = "********";
    return item;  
};

// protected routes
router.use(security);

// admin routes
router.use(adminSecurity);
router.use(resource("users", model.User, {filter: userFilter}));

module.exports = router;
var express = require('express'),
	path = require('path');
	favicon = require('static-favicon'),
	logger = require('morgan'),
	session = require('express-session'),
	cookieParser = require('cookie-parser'),
	bodyParser = require('body-parser'),
	model = require("./model.js"),
	User = model.User, Event = model.Event, Flow = model.Flow,
	config = require("./config"),
	MongoStore = require('connect-mongo')(session),
		
	index = require('./routes/index'),
	users = require('./routes/users'),
	login = require('./routes/login'),
	events = require("./routes/events"),
	register = require("./routes/register"),
	flow = require("./routes/flow"),
	admin = require("./routes/admin");
    api = require("./routes/api/api");

var jst_ts = (new Date("2000-01-01T00:00+09:00")).getTime();

var PST_OFFSET = 17 * 3600 * 1000;
var PDT_OFFSET = 16 * 3600 * 1000;
var HOUR_OFFSET = 3600 * 1000;

var pst = [];
var pdt = [];
var jst = [];
for (var i = 0; i < 24; i++) {
	if (i == 0) {
		jst.push("JST");
		pst.push("PST");
		pdt.push("PDT");
	}
	jst.push((new Date(jst_ts)).getHours());
	pst.push((new Date(jst_ts - PST_OFFSET)).getHours());
	pdt.push((new Date(jst_ts - PDT_OFFSET)).getHours());
	jst_ts += HOUR_OFFSET;
}

var app = express();
	// view engine setup
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');

	app.use(favicon(__dirname + "/public/favicon.ico"));
	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded());
	app.use(cookieParser());
	app.use(express.static(path.join(__dirname, 'public')));

	app.use(function(req, res, next) {
		if (req.path.indexOf("http://") == 0) {
			res.redirect("/login");
		} else {
			next();
		}
	});

	app.use(session({
		secret: config.session_secret,
		resave: true,
		saveUninitialized: true,
		store: new MongoStore({
			mongooseConnection: model.db,
			clear_interval: 60 * 60 * 24
		})
	}));

	var loginCheck = function(req, res, next) {
		if (req.session.user) {
			User.findOne({_id: req.session.user._id}, function(err, user) {
				if (!err && user) {
					next();
				} else {
					res.redirect("/logout");
				}
			});
		} else {
			res.redirect("/login");
		}
	};

	// make session object available in templates
	app.use(function(req, res, next) {
		app.locals.session = req.session;
		next();
	});

	// non-auth routes
	app.use("/login", login);
	app.use("/register", register);

	app.get("/logout", function(req, res) {
		req.session.destroy();
		res.redirect("/login");
	});

	app.locals.title = config.title;
	app.locals.config = config;
	app.locals.choices = {0: "-", 1: "○", 2: "△", 3: "×"};
	app.locals.flowLabel = {"0": "出", "1": "欠", "2": "フ"};
	app.locals.roles = {mdps: "Melee", rdps: "Range", heal: "Heal", tank: "Tank", dps: "DPS"};

    // API
    app.use("/api", api(app));
    
	// auth routes
	app.use(loginCheck);
	app.use("/", index);
	app.get("/clearall", function(req, res) {
		if (req.session.user.name == config.adminuser) {
			User.remove({}, function() {});
			Event.remove({}, function() {});
			Flow.remove({}, function() {});
		}
		res.redirect("/");
	});
	app.use("/users", users);
	app.use("/events", events);
	app.use("/flow", flow);
	app.use("/admin", admin);
	app.get("/times", function(req, res) {
		res.render("times", {jst: jst, pst: pst, pdt: pdt});
	});

	/// catch 404 and forward to error handler
	app.use(function(req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});

	/// error handlers

	// development error handler
	// will print stacktrace
	if (app.get('env') === 'development') {
		app.use(function(err, req, res, next) {
			res.status(err.status || 500);
			res.render('error', {
				message: err.message,
				error: err
			});
		});
	}

	// production error handler
	// no stacktraces leaked to user
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
	});

module.exports = app;
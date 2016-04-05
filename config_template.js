var config = {
	title: "<app name>",
	logo: "<url to logo>",
	passcode: "<registration pass>",
	hostname: "<hostname used for confirmation link>",
	vhost: ["localhost"],	// virtual hosts to bind the "raid" module
	adminuser: "<super user>",
	adminpass: "<super user pass>",
	session_secret: "<session_secret>",
    jwt_secret: "<jwt_secret>", // secret used for json web token
    armory: {
        region: "us",
        realm: "proudmoore"
    },
    server: {
        httpPort: 8080,
        httpsPort: 8443
    },
    email: {	// nodemailer config
        service: "Gmail",	// nodemailer service name
        auth: {
            user: "<email>",
            pass: "<password>"
        }
    },
	fromEmail: "<confirmation email sender address>",
	database: {
		url: "mongodb://localhost:27017/raidjs"
	},
    ssl: {
        keyfile: "<key file>",
        certfile: "<cert file>"
    }
};

module.exports = config;
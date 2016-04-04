var config = {
	title: "<app name>",
	logo: "<url to logo>",
	passcode: "<registration pass>",
	hostname: "<hostname used for confirmation link>",
	adminuser: "<super user>",
	adminpass: "<super user pass>",
	session_secret: "<session_secret>",
	email: {	// nodemailer config
		service: "Gmail",	// nodemailer service name
		auth: {
			user: "<email>",
			pass: "<password>"
		}
	},
	fromEmail: "<confirmation email sender address>"
};

module.exports = config;
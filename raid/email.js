var nodemailer = require("nodemailer"),
	config = require("./config");
	
var transporter = nodemailer.createTransport(config.email);

var email = {
	send: function(to, subj, content, callback) {
		var mailOptions = {
			from: config.fromEmail,
			to: to,
			subject: subj,
			html: content
		};
		transporter.sendMail(mailOptions, function(error, info) {
			if (error) {
				console.log(error);
			} else {
				console.log("Email sent: " + info.response);
				callback(info.response);
			}
		});
	}
};

module.exports = email;
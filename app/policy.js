var async = require('async');
var randtoken = require('rand-token');
var bcrypt = require('bcrypt-nodejs');
var AuthService = require("./services/AuthService.js");
var services = require("./services/services.js");
var ProfileService = require("./services/profileService.js");
var FacebookService = require("./services/FacebookService.js");
var AuthController = require("./controllers/auth.js");
var profile = require("./controllers/profile.js");
var resService = require("./controllers/response.js");
var emailSender = require("./email/sender.js");
var pool = require("../config/db.js").pool;
var ViciAuth = require('../config/vqAuthProvider');

module.exports = function(app, passport) {

	app.post('/viciauth/signup', function(req, res, next) {
		var email = req.body.email;
		var username = req.body.username;
		var password = req.body.password;
		var NewUser, Token;


		if (!req.body.email) {
			return resService.sendResponse(res, {
				status: 400,
				code: "INITIAL_EMAIL"
			});
		}

		if (!req.body.username) {
			return resService.sendResponse(res, {
				status: 400,
				code: "INITIAL_USERNAME"
			});
		}

		if (!req.body.password) {
			return resService.sendResponse(res, {
				status: 400,
				code: "INITIAL_PASSWORD"
			});
		}

		async.waterfall([
			callback => {
				ViciAuth.localSignup(email, password, (err, rUser) => {
					if (err) {
						return callback(err);
					}

					NewUser = rUser;

					return callback();
				});
			},
			function (callback) {
				var uname = req.body.username;

				ProfileService.getFreeUsername(uname, (err, uname) => {
					if (err) {
						return callback(err);
					}

					username = uname;

					return callback();
				});
			},
			function(callback) {
				AuthService.createNewAccount(NewUser.userId, username, {}, function(err, rNewUser) {
					if (err) {
						return callback(err);
					}

					return callback();
				});
			}
		], err => {
			if (err) {
				return resService.sendResponse(res, err);
			}

			req.login(NewUser.userId, err => {
				return resService.sendResponse(res, err, NewUser);
			});
		});
	});

	app.post('/viciauth/login', (req, res, next) => {
		var User = {};

		async.waterfall([
			callback => {
				ViciAuth.localLogin(req.body.id, req.body.pw, (err, rUser) => {
					if (err) {
						return callback(err);
					}
					User = rUser;
					callback();

				});
			},
			callback => {
				ProfileService.getProfile(User.userId, (err, rUser) => {
					console.log(rUser);
					User.name = rUser.name;
					User.profileImageUrl = rUser.profile_image_url;
					callback(err);
				});
			}
		], err => resService.sendResponse(res, err, User));
	});

	app.get('/viciauth/me', function(req, res, next) {
		var User = {};
		if (!req.headers['x-auth-token']) {
			return resService.sendResponse(res, null, {});
		}
		async.waterfall([
			function(callback) {
				ViciAuth.checkToken(req.headers['x-auth-token'], function(err, rUser) {
					if (err) {
						return callback(err);
					}
					User = rUser;
					return callback();
				});
			},
			function(callback) {
				ProfileService.getProfile(User.userId, function(err, rUser) {
					if (err) {
						return callback(err);
					}
					User.name = rUser.name;
					User.profileImageUrl = rUser.profile_image_url;
					return callback(err);
				});
			}
		], function(err) {
			return resService.sendResponse(res, err, User);
		});

	});

	app.post('/viciauth/logout', function(req, res, next) {
		req.logout();
		var token = req.headers['x-auth-token'];
		ViciAuth.destroyToken(token, function(err) {
			resService.sendResponse(res, err);
		});
	});


	app.post('/viciauth/networks/facebook/tokens', function(req, res) {
		FacebookService.getProfile(req.body.networkId, req.body.token, function(err, rProfile) {
			AuthController.loginWithFacebook(req.body.token, req.body.refreshToken, rProfile, function(err, rToken) {
				console.log(rToken);
				resService.sendResponse(res, err, rToken);
			});
		});
	});

	app.get('/forget', function(req, res) {
		res.render('forget-password.ejs', {
			message: null,
			emailSent: false
		});
	});

	app.post('/forget', function(req, res) {

		var email = req.body.email;
		var userId;
		var token;

		async.waterfall([
			function(callback) {
				var sql = "SELECT id FROM user WHERE email = ?";
				pool.query(sql, [email], function(err, result) {
					if (err) {
						callback(err);
					} else {
						if (result.length) {
							userId = result[0].id;
							callback();
						} else {
							callback({
								err: "No email found",
								code: 1
							});
						}
					}
				});
			},
			function(callback) {
				token = randtoken.generate(30);
				var sql = "INSERT INTO tokens SET user_id = ?, token = ?, created_at = ?";

				pool.query(sql, [userId, token, new Date()], function(err, result) {
					if (err) {
						callback(err);
					} else {
						callback();
					}
				});
			},
			function(callback) {
				emailSender.emailForgottenPassword(userId, email, token, function(err) {
					if (err) {
						console.error(err);
						callback(err);
					} else {
						callback();
					}
				});
			}
		], function(err) {
			if (err) {
				if (err.code == 1) {
					res.render('forget-password.ejs', {
						emailSent: false,
						message: "There is no user with this email."
					});
				} else {
					res.status(500).send(err);
				}
			} else {
				res.render('forget-password.ejs', {
					emailSent: true,
					message: null
				});
			}
		});





	});


	app.get('/change_password', function(req, res) {
		if (req.isAuthenticated()) {
			res.render("change-password.ejs", {
				message: null
			});
		} else {
			res.redirect("/login");
		}
	});



	app.post('/change_password', function(req, res) {
		if (req.isAuthenticated()) {


			var passwordCurrent = req.body.passwordCurrent;
			var password = req.body.password;
			var passwordRepeat = req.body.passwordRepeat;

			if (!passwordCurrent) {
				res.render("change-password.ejs", {
					message: "Current password is initial!"
				});
				return;
			}
			if (!password) {
				res.render("change-password.ejs", {
					message: "The provided password is initial!"
				});
				return;
			}
			if (!passwordRepeat) {
				res.render("change-password.ejs", {
					message: "Type your password again!"
				});
				return;
			}

			if (password !== passwordRepeat) {
				res.render("change-password.ejs", {
					message: "The password are not the same!"
				});
				return;
			}


			var sql = "SELECT * FROM user WHERE id = ? AND password IS NOT NULL";
			pool.query(sql, [req.user.id], function(err, result) {
				if (err) {
					console.error(err);
					res.status(500).send(err);
				} else {

					if (result.length) {
						console.log(passwordCurrent, result[0].password);
						if (validPassword(passwordCurrent, result[0].password)) {
							var sql = "UPDATE user SET password = ? WHERE id = ?";

							pool.query(sql, [generateHash(password), req.user.id], function(err, result) {
								if (err) {
									console.error(err);
									res.status(500).send(err);
								} else {
									res.redirect("/profile");
								}
							});
						} else {
							res.render("change-password.ejs", {
								message: "The provided current password is not corrected!"
							});
						}
					} else {
						res.render("change-password.ejs", {
							message: "You don't have local account!"
						});
					}
				}
			});
		} else {
			res.status(401).send();
		}
	});

	app.get('/pw/:userId/:token', function(req, res) {

		var userId = req.params.userId;
		var token = req.params.token;


		var sql = "SELECT id FROM tokens WHERE user_id = ? AND token = ? AND TIMESTAMPDIFF(HOUR,created_at,NOW()) < 24";

		pool.query(sql, [userId, token], function(err, result) {
			if (err) {
				console.error(err);
				res.status(500);
				res.send(err);
			} else {
				if (result.length) {
					res.render("forget-password-give.ejs", {
						message: null
					});
				} else {
					res.status(401);
					res.render("404.ejs");
				}
			}
		});
	});

	app.post('/pw/:userId/:token', function(req, res) {

		var userId = req.params.userId;
		var token = req.params.token;
		var password = req.body.password;
		var password2 = req.body.passwordRepeat;

		if (password !== password2) {
			res.render("forget-password-give.ejs", {
				message: "The passwords are not the same",
				userId: userId,
				token: token
			});
			return;
		}






		async.waterfall([
			function(callback) {
				var sql = "DELETE FROM tokens WHERE user_id = ? AND token = ?";
				pool.query(sql, [userId, token], function(err, result) {
					if (err) {
						console.error(err);
						callback(err);
					} else {
						callback();
					}
				});
			},

			function(callback) {

				var sql = "UPDATE user SET password = ? WHERE id = ?";
				pool.query(sql, [generateHash(password), userId], function(err, result) {
					if (err) {
						console.error(err);
						callback(err);
					} else {
						callback();
					}

				});
			}

		], function(err) {
			if (err) {
				res.status(500).send();
			} else {
				res.redirect("/login/");
			}
		});


	});

	// route for facebook authentication and login
	app.get('/subscriptions', function(req, res) {
		if (req.isAuthenticated()) {
			var disabled = false;
			var sql = "SELECT * FROM user_subscriptions WHERE user_id = ?";
			pool.query(sql, [req.user.id], function(err, result) {
				if (err) {
					req.status(500).send("Internal Server Error");
				} else {
					if (result.length) {
						disabled = true;
					}
					res.render("subscriptions.ejs", {
						disabled: disabled,
						message: null
					});
				}
			});
		} else {
			res.redirect("/login");
		}
	});
	// route for facebook authentication and login
	app.post('/subscriptions', function(req, res) {
		if (req.isAuthenticated()) {
			var disabled;
			var message;
			var sql = "SELECT * FROM user_subscriptions WHERE user_id = ?";
			pool.query(sql, [req.user.id], function(err, result) {
				if (err) {
					req.status(500).send("Internal Server Error");
				} else {
					if (result.length) {
						var sql = "DELETE FROM user_subscriptions WHERE user_id = ?";
						disabled = false;
						message = "Email notifications have been turned on.";
					} else {
						var sql = "INSERT INTO user_subscriptions SET user_id = ?";
						disabled = true;
						message = "Email notifications have been turned off.";
					}
					pool.query(sql, [req.user.id], function(err, result) {
						if (err) {
							res.status(500).send("Internal Server Error");
						} else {
							res.render("subscriptions.ejs", {
								disabled: disabled,
								message: message
							});
						}
					});

				}
			});
		}
	});





	app.get('/deactivate', function(req, res) {
		if (req.isAuthenticated()) {
			res.render("remove-account.ejs");
		} else {
			res.redirect("/login");
		}
	});

	app.post('/deactivate', function(req, res) {
		if (req.isAuthenticated()) {
			var sql = "UPDATE user SET status = 2 WHERE id = ?";
			pool.query(sql, [req.user.id], function(err, result) {
				if (err) {
					res.status(500).send("Internal Server Error");
				} else {
					req.logout();
					res.redirect("/login");
				}
			});
		} else {
			res.redirect("/login");
		}
	});



	app.get('/auth/facebook', passport.authenticate('facebook', {
		scope: ['email', "user_photos"]
	}));

	// handle the callback after facebook has authenticated the user
	app.get('/auth/facebook/callback',
		passport.authenticate('facebook', {
			successRedirect: '/profile',
			failureRedirect: '/'
		}));

};

function isLoggedIn(req, res, next) {

	if (req.isAuthenticated())
		return next();

	res.status(401);
	res.send("NOT_AUTHORIZED");
}

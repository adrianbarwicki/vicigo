// config/passport.js
var async = require("async");
var bcrypt = require('bcrypt-nodejs');

var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

var pool = require("./db.js").pool;
var configAuth = require('./auth');
var ProfileService = require("../app/services/profileService.js");
var AuthService = require("../app/services/AuthService.js");
var emailSender = require("../app/email/sender.js");

var ViciAuth = require('../config/vqAuthProvider');

module.exports = function(passport) {

	passport.serializeUser(function(userId, done) {
		console.log("[PASSPORT] SERIALIZING USER");
		return done(null, userId);
	});

	// used to deserialize the user
	passport.deserializeUser(function(userId, done) {
		console.log("[PASSPORT] DESERIALIZING USER");
		console.log(userId);
		var sql = "SELECT user_id AS id, name, profile_image_url FROM user_profile WHERE user_id = ?";
		pool.query(sql, [userId], function(err, result) {
			if (err) {
				console.error(err);
				return done(err);
			} 
				if (!result.length) {
					console.error("[PASSPORT] Deserializing user - user not found. Bad data format. User does not exist in table user_profile.");
					err = "[PASSPORT] Deserializing user - user not found. Bad data format. User does not exist in table user_profile.";
				}
				done(err, result[0]);

		});
	
	});

	passport.use('local-signup', new LocalStrategy({
			usernameField: 'email',
			passwordField: 'password',
			passReqToCallback: true
		},
		function(req, email, password, done) {

			var User;
			var	username;
		
			if (!req.body.name) {
				return done(null, false, {
					message: 'username is required'
				});
			}

			async.waterfall([
				function(callback) {
					ViciAuth.localSignup(email, password,function(err,rUser){
						if (err) {
							return callback(err);
						} else {
							console.log(rUser);
							User = rUser;
							return callback();
						}
					});
				},
				
				function(callback) {
					var uname = req.body.name;
					ProfileService.getFreeUsername(uname, function(err, uname) {
						if (err) {
							return callback(err);
						}
						username = uname;
						return callback();
					});
				},
				function(callback) {
					AuthService.createNewAccount(User.userId,username,{}, function(err, rNewUser) {
						if (err) {
							return callback(err);
						} else {
							
							return callback();
						}
					});
				}
			], function(err) {
				if (err) {
					if (err.status) {
						return done(null, false, err);
					} else {
						return done(err, false);
					}
				}
				
				return done(null, User.userId);
			});

		}));

	passport.use('local-login', new LocalStrategy({
			usernameField: 'login-email',
			passwordField: 'login-password',
			passReqToCallback: true
		},
		function(req, email, password, done) {

			ViciAuth.localLogin(email, password,function(err,rUser){
					if(err){
						if(err.code == "NO_PASSWORD"){
							return done(null,false,{
								status: 400,
								code: "LOG_IN_WITH_FACEBOOK",
								message: 'Log in with Facebook!'
							});
						}
						if(err.code == "WRONG_PASSWORD"){
							return done(null,false,{
								status: 400,
								code: "WRONG_PASSWORD",
								message: 'Wrong password'
							});
						}
						return done(err, false);
					}
					
					console.log(rUser);
					AuthService.logLogin(rUser.userId, "vicigo");
					return done(null, rUser.userId);
					
			});
		
		}));



	passport.use(new FacebookStrategy({
			clientID: configAuth.facebookAuth.clientID,
			clientSecret: configAuth.facebookAuth.clientSecret,
			callbackURL: configAuth.facebookAuth.callbackURL,
			passReqToCallback: true,
			profileFields: ['id', 'name', 'displayName', 'website', 'work', 'birthday', 'education', 'interested_in', 'photos', 'gender', 'profileUrl', 'hometown', 'friends', 'email']
		},

		function(req, token, refreshToken, profile, done) {

			var User,Profile;
			if (!req.user) {

				async.series([
					function(callback) {
							ViciAuth.connectToFacebook(token, refreshToken, profile,function(err,rUser){
								User = rUser;
								callback(err,User);
							});
					},
					
					function(callback) {
						ProfileService.checkIfExists(User.userId,function(err,rProfile){
							Profile = User;
							callback(err,User);
						});
					},	
					
					
					function(callback) {
						if (Profile) {
							done(null, User.userId);
							return callback();
						} else {
						
							var newProfile = {}, newUser;
						
							var username = profile.name.givenName + profile.name.familyName;
							newProfile.fullname = profile.name.givenName + " " + profile.name.familyName;
							newProfile.gender = profile.gender;
							newProfile.profileImageUrl = profile.photos[0].value;

							async.waterfall([

								function(callback) {
									ProfileService.getFreeUsername(username, function(err, rUsername) {
										if (err) {
											return callback(err);
										} else {
											username = rUsername;
											return callback();
										}
									});
								},
								function(callback) {
									AuthService.createNewAccount(User.userId,username, newProfile, function(err, rNewProfile) {
										if (err) {
											return callback(err);
										}
										newUser = rNewProfile;
										return callback();
									});
								},
	
							], function(err) {
								if (err) {
									return callback(err);
								} else {
									return callback();
								}
							});
						}

					},
				], function(err) {
					if(err){
						console.error(err);
					}
					return done(err, User ? User.userId : false);
				});

			} else {
				req.logout();
				return done(null, false, {
								message: "i am confused, log out and try to login again."
							});
				/*
				user = req.user;
				var email = profile.emails[0].value;
					AuthService.getUserFromNetwork("facebook", profile.id, function(err, rUser) {
					if (err) {
						return done(err);
					}
						
					if (!rUser) {
						AuthService.connectToNetwork(user.id, "facebook", profile.id, token, email);
						return done(null, user);
					} else {
						if (rUser.id == req.user.id) {
							return done(null, user);
						} else {
							req.logout();
							return done(null, null, {
								message: "i am confused, log out and try to login again."
							});
						}

					}

				});
				*/
			}

		}));
};
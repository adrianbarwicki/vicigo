var async = require("async");
var configAuth = require('./auth');
var ProfileService = require("../services/profileService.js");
var AuthService = require("../services/AuthService.js");
var ViciAuth = require('../../config/vqAuthProvider');

var loginWithFacebook = function(token,refreshToken,profile,callback){
        
        var User,Profile;
        async.waterfall([
					function(callback) {
							ViciAuth.connectToFacebook(token,refreshToken,profile,function(err,rUser){
								User = rUser;
								callback(err);
							});
					},
					
					function(callback) {
						ProfileService.checkIfExists(User.userId,function(err,rProfile){
							Profile = rProfile;
							callback(err);
						});
					},	
					
					
					function(callback) {
						if (Profile) {
							return callback();
						} 
            
							var newProfile = {}, newUser;
							var username = profile.name.givenName + profile.name.familyName;
							newProfile.fullname = profile.name.givenName + " " + profile.name.familyName;
							newProfile.gender = profile.gender;
							

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
                    console.log(rNewProfile);
										return callback();
									});
								},
	
							], function(err) {
								callback(err);
							});
				
					},
				], function(err) {
					if(err){
						console.error(err);
					}
          
					return callback(err, User);
				});
  
};

 
				
module.exports = {
  loginWithFacebook :loginWithFacebook
};

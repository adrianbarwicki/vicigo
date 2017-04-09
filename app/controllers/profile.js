var async = require('async');
var historyController = require("./history.js");
var rankingController = require("./ranking.js");
var relationshipsController = require("./relationships.js");
var services = require("../services/services.js");
var ProfileService = require("../services/profileService.js");
var HashtagService = require("../services/HashtagService.js");
var pool = require("../../config/db.js").pool;




var setProfileImage = function(user_id, image_url, callback) {
	var sql = "UPDATE user_profile SET profile_image_url = ? WHERE user_id = ?";
	pool.query(sql, [image_url, user_id], function(err, result) {
		return callback(err);
	});
};

var setProfileBigImage = function(user_id, image_url, callback) {

	var sql = "UPDATE user_profile SET big_profile_image_url = ? WHERE user_id = ?";

	pool.query(sql, [image_url, user_id], function(err, result) {
		return callback(err);
	});
};



var addPoints = function(user_id, points_count, callback) {
	console.log("[INFO] Adding", points_count, "points to user", user_id);
	var sql = "UPDATE user_profile SET points_count = points_count + ? WHERE user_id = ?";
	var values = [points_count, user_id];
	pool.query(sql, values, function(err, result) {
		return callback(err);
	});
};


var getVicigoStats = function(callback) {

	var sqls = [];
	sqls.push({label:"Feeds", sql:"SELECT COUNT(*) AS value FROM posts WHERE  status > 0 AND status < 3"});
	sqls.push({label:"Pics", sql:"SELECT COUNT(*) AS value FROM posts WHERE status > 0 AND status < 3 AND post_type_id = 4"});
	sqls.push({label:"Articles", sql:"SELECT COUNT(*) AS value FROM posts WHERE status > 0 AND status < 3 AND post_type_id = 3"});
	sqls.push({label:"Hashbooks", sql:"SELECT COUNT(*) AS value FROM blogs"});
	sqls.push({label:"Users", sql:"SELECT COUNT(*) AS value FROM user_profile"});
	var Stats = [];
	
	async.each(sqls,function(sql,callback){
			pool.query(sql.sql,function(err, result) {
				if (err){
					return callback(err);
				}
				Stats.push({label:sql.label,value:result[0].value});
				return callback();
			});
		},function(err) {
			callback(err,Stats);
	});

};


var updateStats = function(user_id, callback) {


	var feedsSql = "SELECT COUNT(*) AS feeds_count FROM posts WHERE owner_user_id = ? AND post_type_id > 1 AND ( status > 0 AND status < 3 )";
	var questionsSql = "SELECT COUNT(*) AS questions_count FROM posts WHERE owner_user_id = ? AND post_type_id = 1";
	var answersSql = "SELECT COUNT(*) AS answers_count FROM posts WHERE owner_user_id = ? AND post_type_id = 2";
	var blogsSql = "SELECT COUNT(*) AS blogs_count FROM posts WHERE owner_user_id = ? AND post_type_id = 3 AND status > 0";
	var followingSql = "SELECT COUNT(*) AS following_count FROM user_followers WHERE user_id = ?";
	var followersSql = "SELECT COUNT(*) AS followers_count FROM user_followers WHERE follower_id = ?";
	var pointsSql = "SELECT COUNT(*) AS points_count FROM history WHERE user_id = ?";

	var values = [user_id];
	var stats = {};
	async.parallel([

		function(callback) {
			pool.query(feedsSql, values, function(err, result) {
				if (err) throw err;
				stats.feeds_count = result[0].feeds_count;
				callback();
			});
		},

		function(callback) {
			pool.query(followingSql, values, function(err, result) {
				if (err) throw err;
				stats.following_count = result[0].following_count;
				callback();
			});
		},
		function(callback) {
			pool.query(followersSql, values, function(err, result) {
				if (err) throw err;
				stats.followers_count = result[0].followers_count;
				callback();
			});
		},
	], function(err) {
		var sql = "UPDATE user_profile SET ? WHERE user_id = ?";
		var values = [stats, user_id];
		pool.query(sql, values, function(err, result) {
			return callback(err);
		});
	});

};

var updateProfile = function(user_id, profile, callback) {

	console.log("[PROFILE CONTROLLER] Updating profile");
	var sql = "UPDATE user_profile SET ? WHERE user_id = ?";
	var values = [profile, user_id];

	pool.query(sql, values, function(err, result) {
		return callback(err);
	});
};


var getUserStatus = function(userId, callback) {
	var userStatus = {};


	async.parallel([
		function(callback) {
			var sql = "SELECT id FROM posts WHERE owner_user_id = ? AND status = 0";
			var values = [userId];
			pool.query(sql, values, function(err, result) {
				if (err) {
					console.error(err);
					callback({
						err: err,
						status: 500
					});
				} else {
					if (result.length) {
						userStatus.draft = true;
					} else {
						userStatus.draft = false;
					}
					return callback();
				}
			});

		},


		function(callback) {
			var sql = "SELECT COUNT(*) AS notifications_count FROM history WHERE user_id = ? AND status = 0 AND ( event_type_id = 2 OR event_type_id = 6 OR event_type_id = 11 OR event_type_id = 12 )";
			var values = [userId];
			pool.query(sql, values, function(err, result) {
				if (err) {
					console.error(err);
					callback({
						err: err,
						status: 500
					});
				} else {
					if (result.length) {
						userStatus.notifications_count = result[0].notifications_count;
						callback();
					} else {
						userStatus.notifications_count = 0;
						callback();
					}

				}
			});

		}



	], function(err) {
		callback(err, userStatus);
	});


};


var getProfile = function(profileId, options, callback) {

	var profileCore, profileHashtags, alreadyFollowing, profileNetworks = [];



	async.waterfall([
		function(callback) {
			if (isNaN(profileId)) {
				pool.query("SELECT user_id AS user_id FROM user_profile WHERE name = ?", [profileId], function(err, result) {
					if (err) {
						return callback(err);
					} else {
						
						if(!result.length){
							return callback({status:404, message : "user " + profileId + "not found"});
						}
						profileId = result[0].user_id;
						callback();

					}
				});
			} else {
				callback();
			}
		},
		function(callback){
						callback();
						updateStats(profileId, function(err) {
							if (err) console.error(err);
						});
		},
		function(callback) {


			async.parallel([


				function(callback) {
					var sql = [];
					sql.push("SELECT");
					sql.push("profile.user_id AS user_id, profile.name AS name,");
					sql.push("profile.title AS title, profile.profile_image_url AS profile_image_url,");
					sql.push("profile.website_url as website_url,");
					sql.push("profile.followers_count AS followers_count,");
					sql.push("profile.following_count AS following_count,");
					sql.push("profile.feeds_count AS feeds_count ");
					sql.push("FROM user_profile as profile");
					sql.push("WHERE profile.user_id = ?");
					sql = sql.join(" ");

					pool.query(sql, [profileId], function(err, result) {
						if (err) {
							console.error(err);
							callback({
								err: err,
								status: 500
							});
						} else {
							if (result.length) {
								profileCore = result[0];
								return callback();
							} else {
								callback({
									err: err,
									status: 404
								});
							}
						}
					});
				},

				function(callback) {
					HashtagService.getHashtagsForProfile(profileId, {
						limit: 10
					}, function(err, hashtags) {
						if (err) {
							callback(err);
						} else {
							profileHashtags = hashtags;
							callback();
						}
					});
				},

				function(callback) {
					if (!options.userId) {
						return callback();
					} else {
						services.checkIfFollowed(options.userId, profileId, function(err, alreadyFollowed) {
							if (err) {
								callback({
									err: err,
									status: 500
								});
							} else {
								alreadyFollowing = alreadyFollowed;
								return callback();
							}
						});
					}
				},

			], function(err) {
				if (err) {
					return callback(err);
				} 
					profileCore.hashtags = profileHashtags;
					profileCore.networks = [];
					if (options.userId) {
						profileCore.alreadyFollowing = alreadyFollowing;
					}
					return callback();
			});
		}
	], function(err) {
		return callback(err, profileCore);
	});


};


var getRecommendedProfiles = function(profileId,params,callback){
	ProfileService.getRecommendedProfiles(profileId,{},function(err,rProfiles){
		callback(err,rProfiles);
	});
};

module.exports = {
	getProfile: getProfile,
	getRecommendedProfiles : getRecommendedProfiles,
	getVicigoStats : getVicigoStats,
	setProfileImage: setProfileImage,
	setProfileBigImage: setProfileBigImage,
	getUserStatus: getUserStatus,
	addPoints: addPoints,
	updateStats: updateStats,
	updateProfile: updateProfile,
};
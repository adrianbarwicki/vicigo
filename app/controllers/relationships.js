


//		rel.user_id = followerId;
//		rel.follower_id = followedId;

var async = require('async');
var RelService = require("../services/RelService.js");
var pool = require("../../config/db.js").pool;
var historyController = require('./history.js');


module.exports.getFollowing = function(userId,options, callback) {

	options.limit = ( options.limit ) ? options.limit : 100;
	var followers = [];
	
	var query = "SELECT followed.user_id AS id, followed.name as name, followed.title AS title, followed.profile_image_url AS profile_image_url FROM user_followers as follower";
	query += " INNER JOIN user_profile as followed ON follower.follower_id = followed.user_id";
	query += " INNER JOIN user AS followed_user ON followed.user_id = followed_user.id";
	query += " WHERE follower.user_id = ? AND followed_user.status = 0";
	query += " ORDER BY followed.name LIMIT ?";

					pool.query(query, [userId, options.limit], function(err, result) {
						if (err) {
							console.error(err);
							callback(err);
						} else {
							followers = result;
							if (options.userId){
								async.each(followers, function(follower_profile, callback){
									var index = followers.indexOf(follower_profile);
									var query2 = "SELECT COUNT(*) AS followingFlag FROM user_followers WHERE user_id = ? AND follower_id = ?";
									pool.query(query2, [options.userId,follower_profile.id], function(err, followingResult) {
										if (err){
											console.error(err);
											callback(err);
										} else {
											if (followingResult.length) {
												followers[index].alreadyFollowing = (followingResult[0].followingFlag > 0) ? true: false;
											} else {
												followers[index].alreadyFollowing = false;
											}
										 
										 callback();
										}
									});
								}, function(err){
									callback(err, followers);	
								});
							} else {
							callback(null, followers);	
							}
						}
					});
};



module.exports.getFollowers = function(userId,options, callback) {

	options.limit = ( options.limit ) ? options.limit : 100;
	//options.userIdView
	var followers = [];
	
	var query = "SELECT profile.user_id AS id, profile.name AS name, profile.title AS title, profile.profile_image_url AS profile_image_url FROM user_followers as follower";
	query += " INNER JOIN user_profile as profile ON follower.user_id = profile.user_id";
	query += " INNER JOIN user AS follower_user ON follower.user_id = follower_user.id";
	query += " WHERE follower_id = ? AND follower_user.status = 0";
	query += " ORDER BY profile.name LIMIT ?";

	
		pool.query(query, [userId, options.limit], function(err, result) {
						if (err) {
							return callback(err);
						} 
							followers = result;
							if (options.userId){
								async.eachSeries(followers, function( follower_profile, callback){
									var index = followers.indexOf(follower_profile);
									var query2 = "SELECT COUNT(*) AS followingFlag FROM user_followers  WHERE user_id = ? AND follower_id = ?";
									pool.query(query2, [options.userId, follower_profile.id], function(err, followingResult) {
										if (err){
											console.error(err);
											callback(err);
										} else {
										 followers[index].alreadyFollowing = (followingResult[0].followingFlag > 0) ? true: false;
										 callback();
										}
									});
								}, function(err){
									callback(err, followers);	
								});
								
							} else {
							callback(null, followers);	
							}

		});
};



module.exports.createRel = function(followerId, followedId, callback) {
	
	if(followerId == followedId){
		return callback();
		
	} 
	
	if (!followerId || !followedId) {
		return callback({ status : 400, message: "initial fields"});
	} 
	
	
		var rel = {};
		rel.user_id = followerId;
		rel.follower_id = followedId;

		RelService.checkIfFollowed(rel.user_id, rel.follower_id, function(err, alreadyFollowed) {
			if (err) {
				return callback(err);
			} 
			
				if (alreadyFollowed) {
					return callback({ status:400, message: "User already followed.."});
				}
					var query = "INSERT INTO user_followers SET ?";
					pool.query(query, rel, function(err, result) {
						if (err) {
							return callback(err);
						} else {
							if (result.insertId){
								historyController.FollowEvent(rel.user_id, rel.follower_id);
								return callback();
							} else {
								return callback();
							}
						}
					});
		
		});
};





module.exports.destroyRel = function(followerId, followedId, callback) {
	if (followerId == followedId) {
		callback({ status:400, message: "Follower and Following Ids are the same"});
		return;
	} 
	
	
	if (!followerId || !followedId) {
		callback({ status:400, message: "Initial fields"});
		return;
	} 
		

		RelService.checkIfFollowed(followerId, followedId, function(err, alreadyFollowed) {
			if (err) {
				return callback(err);
			} 
				
		if (!alreadyFollowed) {
					return callback({ status: 400, message : "User is not followed anyway"});
		} 
					
		var query = "DELETE FROM user_followers WHERE user_id = ? AND follower_id = ?";
		var values = [followerId, followedId];
					pool.query(query, values, function(err, result) {
						callback(err);
					});

		});
};
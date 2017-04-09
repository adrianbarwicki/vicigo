var async = require('async');
var services = require('../services/services.js');
var historyController = require('./history.js');
var pool = require("../../config/db.js").pool;
var errorCodes = require("../../config/errorCodes.js");


function checkIfAlreadyUpvoted(postId, userId, callback) {

	var sql = "SELECT COUNT(*) as upvotes_count FROM votes WHERE user_id = ? AND post_id = ?";
	var values = [userId, postId];
	pool.query(sql, values, function(err, result) {
		if (err) {
			callback(err);
		} else {
			if (result.length) {
				callback(null, (result[0].upvotes_count > 0) ? true : false);
			} else {
				callback({
					err: "notAllowed",
					msg: "Does not exists"
				});
			}
		}

	});
}


function checkIfUpvoteAllowed(postId, userId, callback) {

	var sql = "SELECT owner_user_id as userId FROM posts WHERE id = ?";
	var value = [postId];
	pool.query(sql, value, function(err, result) {
		if (err) {
			callback(err);
		} else {
			if (result.length) {
				callback(null, (result[0].userId == userId) ? false : true);
			} else {
				callback(null, false);
			}
		}

	});
}

var upvote = function(postId, userId, callback) {
	
	
	async.waterfall([
	function(callback){
		 checkIfUpvoteAllowed(postId, userId, function(err, upvoteAllowed) {
		if(err){
			callback(err);
		} else{
		if (upvoteAllowed) {
					callback();
		} else {
					callback(errorCodes["NOT_AUTHORIZED"]);
		}
		}
	});
	},
	function(callback){
		services.checkIfAlreadyUpvoted(postId, userId, function(err, alreadyUpvoted) {
				if (!alreadyUpvoted) {
					callback();
				} else {
					callback(errorCodes["ALREADY_UPVOTED"]);
				}
			});
	},
	function(callback){
		upvoteDo(postId, userId);
		callback();
	},
	
	],function(err){
		callback(err);
	});
	


	function upvoteDo(postId, userId) {
		var vote = {};
		vote.post_id = postId;
		vote.user_id = userId;
		vote.vote_type_id = 1; // upvote
		vote.created_at = new Date();

		var sql = "INSERT votes SET ?";

		pool.query(sql, vote, function(err, result) {
			if (err) throw err;


			async.parallel([

				function(callback) {
					historyController.UpvoteEvent(userId, postId, function(err) {
						if (err) throw err;
						callback();
					});

				},
				function(callback) {
					historyController.UpvotedEvent(userId, postId, function(err) {
						if (err) throw err;
						callback();
					});
				}


			], function(err) {
				callback(err);
			});
		});
	}
};




var downvote = function(postId, userId, callback) {

	checkIfUpvoteAllowed(postId, userId, function(err, upvoteAllowed) {

		// for downvote the upvote must be already there!!!	
		if (upvoteAllowed) {
		
			services.checkIfAlreadyUpvoted(postId, userId, function(err, alreadyUpvoted) {
				if (alreadyUpvoted) {
					downvoteDo(postId, userId);
				} else {
					callback({
						err: "You can only downvote already upvoted posts."
					});
				}
			});


		} else {
			callback({
				err: "You can not downvote or upvote your own posts."
			});
		}
	});

	function downvoteDo(postId, userId) {
		var vote = {};
		vote.post_id = postId;
		vote.user_id = userId;
		vote.vote_type_id = 1; // upvote
		vote.created_at = new Date();

		var sql = "DELETE FROM votes WHERE post_id = ? AND user_id = ? AND vote_type_id = 1";

		pool.query(sql, [vote.post_id, vote.user_id], function(err, result) {
			if (err) return callback(err);


			async.parallel([

				function(callback) {
					historyController.DownvoteEvent(userId, postId, function(err) {
						return callback(err);
					});

				},
				function(callback) {
					historyController.DownvotedEvent(userId, postId, function(err) {
						return callback(err);
					});
				}

			], function(err) {
				return callback(err);
			});
		});
	}
};


var getUpvotes = function(postId, options, callback) {
	var sql = "SELECT profile.name as name, profile.user_id as user_id, profile.profile_image_url ,vote.created_at as created_at, profile.title as title";
	sql += " FROM votes AS vote";
	sql += " INNER JOIN user_profile AS profile ON vote.user_id = profile.user_id";
	sql += " INNER JOIN user AS user ON user.id = profile.user_id";
	sql += " WHERE vote.post_id = ? AND user.status = 0";
	sql += " ORDER BY vote.created_at DESC LIMIT ? ";

	options.limit = (options.limit) ? options.limit : 20;
	

	pool.query(sql,[postId, options.limit], function(err, result) {
		if (err) {
			callback(err);
		} else {	
			callback(null, result);
		}
	});
};


var getUpvotesActivity = function(userId, callback) {
	var sql = "SELECT *";
	sql += " FROM votes AS vote";
	sql += " INNER JOIN posts as post ON vote.post_id = post.id";
	sql += " WHERE vote.user_id = ?";
	sql += " OR vote.post_id IN (SELECT id FROM posts WHERE owner_user_id = ? )";
	sql += " ORDER BY vote.created_at DESC";
	var values = [userId, userId];

	pool.query(sql, values, function(err, result) {
		if (err){
			console.log(err);
			return callback(err);
		} 
			return callback(null, result);

	});
};



var getRanking = function(options, callback) {
	
	var ranking = {};
	
	async.parallel([
		function(callback){
			var sql = "SELECT *";
			sql += " FROM user_profile";
			sql += " ORDER BY vicis DESC LIMIT 10";
	

	pool.query(sql, [], function(err, result) {
		if (err){
			callback(err);
		} else {
			ranking.authors_top = result;
			callback();
		}
	});
		}, 
		function(callback){
		var sql = "SELECT *";
			sql += " FROM posts";
			sql += " ORDER BY upvotes WHERE post_type_id = 2 OR post_type_id = 3 DESC LIMIT 10";
	

	pool.query(sql, [], function(err, result) {
		if (err) throw err;
		ranking.content_top = result;
		callback();
	});
		},
		function(callback){
			var sql = "SELECT SUM(points_amount) as weight";
			sql += " FROM history";
			sql += " ORDER BY weight DESC LIMIT 10";
	

	pool.query(sql, [], function(err, result) {
		if (err){
			console.error(err);
			callback(err);
		} else {
			ranking.authors_trending = result;
			callback();
		}
		
	});
		},
		
		function(callback){
			var sql = "SELECT SUM(points_amount) as weight";
			sql += " FROM history";
			sql += " ORDER BY weight DESC LIMIT 10";
	

	pool.query(sql, [], function(err, result) {
		if (err){
			console.error(err);
			callback(err);
		} else {
		ranking.authors_trending = result;
		callback();
		}
	});
		}
		
	], function(err){
		if (err){
			callback(err);
		} else {
			callback();
		}
	});
	
};

var getBestRatedProfiles = function(params,callback) {
	var et_data = [];
	params.limit = params.limit ? params.limit : 4;
	var sql = "SELECT * FROM user_profile ORDER BY points_count DESC LIMIT ?";
		pool.query(sql, [params.limit], function(err, r_recommendedUsers) {
				if (err) {
					console.error(err);
					callback({err:err, status:500});
				} else {
						callback(err,r_recommendedUsers);
				}
			});
};

module.exports = {
	getBestRatedProfiles : getBestRatedProfiles,
	getRanking : getRanking,
	checkIfAlreadyUpvoted : checkIfAlreadyUpvoted,
	checkIfUpvoteAllowed : checkIfUpvoteAllowed,
	upvote : upvote,
	downvote : downvote,
	getUpvotes : getUpvotes,
	getUpvotesActivity : getUpvotesActivity,
};



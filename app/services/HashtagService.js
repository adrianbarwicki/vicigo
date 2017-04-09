var async = require('async');
var pool = require('../../config/db.js').pool;


var purifyHashTag = function(hashtag) {
	//hashtag = hashtag.toLowerCase();
	//hashtag = hashtag.replace(/[^\w\s]/gi, '');
	//hashtag = hashtag.replace(/\s+/g, '');
	hashtag = hashtag.replace('#', '');
	hashtag = hashtag.replace('justinbieber', 'notcool');
	return hashtag;
};


var getTrendingHashtags = function(params, callback) {
	params.limit = (params.limit) ? params.limit : 10;
	var sql = "SELECT hashtag.hashtag AS hashtag, count(UPPER(hashtag.hashtag)) as count";
	sql += " FROM hashtag_posts AS hashtag";
	sql += " INNER JOIN posts AS post ON post.id = hashtag.post_id";
	sql += " WHERE post.post_type_id > 1 AND post.status > 0 AND post.status < 4";
	sql += " GROUP BY hashtag ORDER BY count DESC LIMIT ?";
	pool.query(sql, [params.limit], function(err, result) {
		if (err) {
			console.log(err);
			callback(err);
		} else {
			callback(err, result);
		}
	});
};

var ensureHashtagExists = function(hashtag, callback) {

	if (!hashtag) {
		callback("initial hashtag");
	}


	hashtag = purifyHashTag(hashtag);

	var sql = "INSERT IGNORE INTO hashtags SET hashtag = ?";
	var values = [hashtag];
	pool.query(sql, values, function(err, result) {
		callback(err, result);
	});
};


var addHashtagToPost = function(hashtag, postId, callback) {

	if (!hashtag || !postId) {
		callback("initial import");
	}


	hashtag = purifyHashTag(hashtag);

	var sql = "INSERT IGNORE INTO hashtag_posts SET hashtag = ?, post_id = ?";
	var values = [hashtag, postId];
	pool.query(sql, values, function(err, result) {
		callback(err, result);
	});
};

var getHashtagsForPost = function(postId, callback) {
	if (!postId) {
		callback("initial import");
	}

	var sql = "SELECT DISTINCT hashtag FROM hashtag_posts WHERE post_id = ?";
	var values = [postId];
	pool.query(sql, values, function(err, result) {
		callback(err, result);
	});
};


var getHashtagsForProfile = function(profileId, params, callback) {
	if (!profileId) {
		callback("initial import");
	}
	
	
	params.limit = (params.limit) ? params.limit : 10;
	var sql = "SELECT hashtag as hashtag, count(hashtag) AS count FROM hashtag_posts ";
	sql += " WHERE post_id IN";
	sql += " ( SELECT id FROM posts WHERE owner_user_id = ? AND ( status = 1 OR status = 2 ) AND post_type_id != 1 )";
	sql += " group by hashtag  ORDER BY count DESC LIMIT ?";
	pool.query(sql, [profileId, params.limit], function(err, result) {
		if (err) {
			console.log(err);
			callback(err);
		} else {
			callback(err, result);
		}
	});
}

var removeHashtagsFromPost = function(postId, callback) {
	var sql = "DELETE FROM hashtag_posts WHERE post_id = ?";
	pool.query(sql, [postId], function(err, result) {
		if (err) {
			console.log(err);
			callback(err);
		} else {
			callback(err, result);
		}
	});
}


var addHashtagsToPost = function(postId, hashtags, userId, callback) {
	
	
	
	hashtags = hashtags ? hashtags : [];
	
	
	if(typeof hashtags == "object" || typeof hashtags == "array"){
	hashtags = hashtags.filter(function(item){
		return (item.length>2) ? true : false;
	});
	} else if ( typeof hashtags == "string"){
					try {
						hashtags = hashtags.split(",");
					} catch (err) {
						console.error(err);
						hashtags = [];
					}
	}
	

		
	async.waterfall([
		function(callback) {
			removeHashtagsFromPost(postId, function(err) {
				callback(err);
			})
		},
		function(callback) {
			async.eachLimit(hashtags,2,function(hashtag, callback) {
				async.waterfall([
					function(callback) {
						ensureHashtagExists(hashtag, function(err) {
							callback(err);
						})
					},
					function(callback) {
						addHashtagToPost(hashtag, postId, function(err) {
							callback(err);
						})
					}
				], function(err) {
					callback(err);
				});
			}, function(err) {
				callback(err);
			});
		}
	], function(err) {
		callback(err);
	});
};


var getRecommendedHashtags = function(profileId, params, callback) {
	params.limit = (params.limit) ? params.limit : 7;
	var values = [];
	var sql = "";
	sql += "( SELECT DISTINCT hashtags.hashtag as hashtag, count(hashtags.hashtag) AS count, 0 AS promoted FROM hashtag_posts AS hashtags";
	sql += " INNER JOIN posts AS post ON ( post.id = hashtags.post_id AND post.post_type_id != 1 AND post.status = 2 )";
	sql += " WHERE hashtags.hashtag NOT IN ( SELECT hashtag FROM hashtag_followers AS followed_hashtag  WHERE followed_hashtag.user_id = ? ) ";
	sql += " GROUP BY hashtags.hashtag ORDER BY count DESC LIMIT 8 )";
	sql += " UNION ";
	sql += " ( SELECT hashtag as hashtag, 1 AS count, 1 AS promoted FROM hashtag_promotion ";
	sql += " WHERE hashtag NOT IN ( SELECT hashtag FROM hashtag_followers AS followed_hashtag  WHERE followed_hashtag.user_id = ? ) LIMIT 1 )";
	sql += " ORDER BY promoted DESC, count DESC LIMIT ?"
	values.push(profileId,profileId, params.limit);

	pool.query(sql, values, function(err, result) {
		if (err) {
			console.log(err);
			callback({
				err: err,
			});
		} else {
			return callback(err, result);
		}
	});
};



var isFollowingHashtag = function(hashtag, userId, callback) {

	if(!hashtag || !userId){
		return callback("isFollowingHashtag - intial fields");
	}

	var sql = " SELECT * FROM hashtag_followers WHERE hashtag = ? AND user_id = ?";

	pool.query(sql, [hashtag, userId], function(err, result) {
		if (err) {
			return callback({
				err: err,
				sql: sql
			});
		} else {
			if (result.length) {
				return callback(err, {
					hashtag: hashtag,
					user_id: userId,
					isFollowing: true
				});
			} else {
				return callback(err, {
					hashtag: hashtag,
					user_id: userId,
					isFollowing: false
				});
			}

		}
	});
};
var followHashtag = function(hashtag, userId, callback) {
	isFollowingHashtag(hashtag, userId, function(err, isFollowed) {
		if(err){
			return callback(err);
		}
		
		
		
		if (!isFollowed.isFollowing) {
				var hashObj = {
		hashtag: hashtag,
		user_id: userId
	};
			var sql = "INSERT IGNORE INTO hashtag_followers SET ?";
			pool.query(sql, hashObj, function(err, result) {
				if (err) {
					console.log(err);
					callback({
						err: err,
						sql: sql
					});
				} else {
					callback(err, result);
				}
			});
		} else {
			callback();
		}
	});

};

var unfollowHashtag = function(hashtag, userId, callback) {


	var hashObj = {
		hashtag: hashtag,
		user_id: userId
	};

			var sql = "DELETE FROM hashtag_followers WHERE hashtag = ? AND user_id = ?";
			pool.query(sql, [hashObj.hashtag, hashObj.user_id], function(err, result) {
				if (err) {
					console.log(err);
					callback({
						err: err,
						sql: sql
					});
				} else {

					callback(err, result);
				}
			});
};
var getFollowedHashtags = function(profileId, params, callback) {
			var sql = "SELECT * FROM hashtag_followers WHERE user_id = ? ORDER BY hashtag LIMIT ?";
			pool.query(sql, [profileId, params.limit ], function(err, result) {
				if (err) {
					console.log(err);
					callback({
						err: err,
						sql: sql
					});
				} else {
					callback(err, result);
				}
			});
};



module.exports = {
	getFollowedHashtags : getFollowedHashtags,
	isFollowingHashtag: isFollowingHashtag,
	followHashtag: followHashtag,
	unfollowHashtag: unfollowHashtag,
	getRecommendedHashtags: getRecommendedHashtags,
	removeHashtagsFromPost: removeHashtagsFromPost,
	getHashtagsForProfile: getHashtagsForProfile,
	getHashtagsForPost: getHashtagsForPost,
	ensureHashtagExists: ensureHashtagExists,
	addHashtagToPost: addHashtagToPost,
	addHashtagsToPost: addHashtagsToPost,
	getTrendingHashtags: getTrendingHashtags,
};
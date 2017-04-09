var async = require('async');
var pool = require("../../config/db.js").pool;


var checkIfFollowed = function(followerId, followedId, callback) {
		if (!followerId || !followedId) {
			callback({status:400,message:"initial fields"});
			return;
		} 
			var query = "SELECT * FROM user_followers WHERE user_id = ? AND follower_id = ?";

			pool.query(query, [followerId, followedId], function(err, result) {
				if (err) {
					callback(err);
				} else {
					if (result.length) {
						return callback(null, true);
					} else {
						return callback(null, false);
					}
				}
			});
	};

module.exports = {
  checkIfFollowed : checkIfFollowed,
};
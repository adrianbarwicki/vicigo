var async = require('async');
var HashtagService = require("./HashtagService.js");
var PostService = require("./PostService.js");
var ErrorService = require("./ErrorService.js");
var pool = require('../../config/db.js').pool;

var striptags = require('striptags');
var moment = require('moment');


var getUpvotes = function(postId, options, callback) {
	var sql = "SELECT profile.name as name, profile.user_id as user_id, profile.profile_image_url ,vote.created_at as created_at, profile.title as title";
	sql += " FROM votes AS vote";
	sql += " INNER JOIN user_profile AS profile ON vote.user_id = profile.user_id";
	sql += " WHERE vote.post_id = ? ORDER BY vote.created_at DESC LIMIT ? ";

	options.limit = (options.limit) ? options.limit : 20;
	

	pool.query(sql,[postId, options.limit], function(err, result) {
		if (err) {
			callback(ErrorService.generateError(err));
		} else {	
			callback(null, result);
		}
	});
};

module.exports = {
  getUpvotes : getUpvotes,
};
var moment = require('moment');
var async = require('async');
var profile = require('./profile.js');
var historyController = require('./history.js');
var postController = require('./post.js');
var services = require('../services/services.js');
var pool = require('../../config/db.js').pool;

module.exports.getComments = function(postId, callback) {

	var sql = "SELECT";
	sql += " comment.comment_id as comment_id, comment.body as body, comment.created_at as created_at,";
	sql += " profile.name as authorName, profile.user_id as authorId, profile.profile_image_url as authorImage";
	sql += " FROM comments AS comment";
	sql += " INNER JOIN user_profile as profile ON comment.owner_user_id = profile.user_id";
	sql += " WHERE comment.post_id = ? AND ( NOT comment.status = 1 )  ORDER BY comment.created_at DESC LIMIT 50";
	
	pool.query(sql,[postId], function(err, result) {
		if (err){
			return callback(err);
		} 
		result = result.map(function(item){
			item.created_at = moment(item.created_at).fromNow();
			return item;
		});
		console.log(result);
		return callback(null, result);
	});
};



module.exports.postComment = function(postId, userId, text, callback) {

	

	var insertedComment;
	var comment = {};
	comment.post_id = postId;
	comment.owner_user_id = userId;
	comment.body = text;
	comment.created_at = new Date();
	var sql = "INSERT INTO comments SET ?";
	pool.query(sql, comment, function(err, result) {
		if (err) {
			callback(err);
		} else {
			
			async.series([
				function(callback){
			var sql2 = "SELECT comment.comment_id as comment_id, comment.body as body, comment.created_at as created_at, profile.name as authorName, profile.user_id as authorId, profile.profile_image_url as authorImage";
			sql2 += " FROM comments AS comment INNER JOIN user_profile as profile ON comment.owner_user_id = profile.user_id WHERE comment.comment_id = ?";
			pool.query(sql2, [result.insertId], function(err, result) {
				if (err) {
					callback(err);
				} else {
					
					insertedComment = result[0];
					insertedComment.created_at = moment(insertedComment.created_at).fromNow();
					callback(null);
					
				}
			});
				},
				function(callback){
					historyController.CommentEvent(userId, postId, insertedComment.comment_id, function(err){
						if(err){
							callback(err);
						} else {
							callback();
						}
					});	
					
				},

			], function(err){
				callback(err, insertedComment);
			});
		}
	});

};



module.exports.deleteComment = function(commentId, postId, userId, callback) {
			var sql = "UPDATE comments SET status = 1 WHERE comment_id = ? AND post_id = ? AND owner_user_id = ?";
			pool.query(sql, [commentId, postId, userId], function(err, result) {
				if (err) {
					callback(err);
				} else {
					callback();
				}
			});
	
		pool.query("UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?", [postId], function(err, result) {
				if (err) {
					console.log(err);
				} 
			});
};
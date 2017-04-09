var async = require('async');
var slug = require('slug');
var striptags = require('striptags');
var services = require("../services/services.js");
var PostService = require("../services/PostService.js");
var HashtagService = require("../services/HashtagService.js");
var FormatService = require("../services/FormatService.js");
var profileController = require("./profile.js");
var postController = require("./post.js");
var commentController = require("./comments.js");
var relationshipsController = require("./relationships.js");
var historyController = require("./history.js");
var pool = require("../../config/db.js").pool;



var updatePost = function(postId, ownerUserId, Post, callback) {

	async.waterfall([
		function(callback) {
			PostService.checkIfPostOwner(postId, ownerUserId, function(err, isOwner) {
				if (err) {
					return callback(err);
				}
				if (!isOwner) {
					return callback({
						status: 401,
						code: "NOT_AUTHORIZED"
					});
				}
				callback();
			});
		},
		function(callback) {

			async.parallel([
				function(callback) {
					if (Post.body) {
						PostService.updatePostBody(postId,ownerUserId,Post.body,function(err) {
							if (err) {
								return callback(err);
							}
							return callback();
						});
					} else {
						return callback();
					}
				},
		function(callback) {
			if (Post.hashtags) {
			
					try {
						Post.hashtags = Post.hashtags.split(",");
					} catch (err) {
						console.error(err);
						Post.hashtags = [];
					}	
				
			HashtagService.addHashtagsToPost(postId, Post.hashtags, ownerUserId, function(err) {
				if (err) {
					callback(err);
				} else {
					callback();
				}
			});
			} else {
				return callback();
			}
		},
				function(callback) {
					if (Post.title) {
						PostService.updatePostTitle(postId,ownerUserId,Post.title,function(err) {
							if (err) {
								return callback(err);
							}
							return callback();
						});
					} else {
						return callback();
					}
				}
			], function(err) {
				callback(err);
			});


		}
	], function(err) {
		return callback(err);
	})

};






var saveDraftOrPublish = function(postId, userId, status, post, callback) {
	if (status !== 0 && status !== 1 && status !== 2) {
		return callback({
			err: "Status not allowed",
			status: 403
		});

	}



	if (!postId) {
		return callback({
			status: 400,
			err: "INITIAL_ARGUMENTS"
		});
	}

	var data;

	var postUpdate = {};


	async.waterfall([

		function(callback) {

			var sql = "SELECT post_type_id as post_type_id FROM posts WHERE id = ?";
			pool.query(sql, [postId], function(err, result) {
				if (err) {
					console.error(err);
					return callback(err);
				}

				if (!result.length) {
					return callback({
						status: 400,
						code: "POST_NOT_FOUND"
					});
				}


				postUpdate.body = post.body;
				postUpdate.status = status;
				try {
					postUpdate.title = post.title ? striptags(post.title).trim() : "";
				} catch (err) {
					postUpdate.title = "";
				}


				return callback();

			});


		},


		function(callback) {

			if (status == 0 || status == 1) {

				services.checkIfAlreadyPublished(postId, function(err, alreadyPublished) {
					if (err) {
						console.log(err);
						callback({
							err: "Error in Service",
							status: 403
						});
					} else {

						if (alreadyPublished) {
							callback({
								err: "Already published",
								status: 403
							});
						} else {
							callback();
						}

					}
				});
			} else {
				callback();
			}
		},


		function(callback) {
			services.checkIfPostBelongsToUser(postId, userId, function(err, belongsToUser) {
				if (err) {
					callback({
						err: err,
						status: 500
					});
				} else {

					if (belongsToUser) {
						callback();
					} else {
						callback({
							err: "Post does not belong to user. Not authorized",
							status: 401
						});
					}
				}
			});
		},

		function(callback) {
			HashtagService.addHashtagsToPost(postId, post.hashtags, userId, function(err) {
				if (err) {
					callback(err);
				} else {
					callback();
				}
			});
		},
		function(callback) {
			if (postUpdate.title) {
				postUpdate.alias = slug(postUpdate.title);
			}


			postController.updatePost(postId, postUpdate, function(err, result) {
				if (err) {
					console.error(err);
					callback({
						err: err,
						status: 500
					});
				} else {
					data = result;
					if (status == 0) {
						callback();
					}

					if (status == 1) {

						PostService.analyzePost(postId, {});

						historyController.postEvent(3, userId, postId, function(err) {
							if (err) {
								console.error(err);
								callback({
									err: err,
									status: 500
								});
							} else {
								callback(null);
							}
						});
					}
					if (status == 2) {
						callback(null);
					}
				}
			});
		}

	], function(err) {
		callback(err, data);
	});
};


var publishPost = function(postId,ownerUserId,callback){
	
	async.waterfall([
		function(callback) {
			PostService.checkIfPostOwner(postId, ownerUserId, function(err, isOwner) {
				if (err) {
					return callback(err);
				}
				if (!isOwner) {
					return callback({
						status: 401,
						code: "NOT_AUTHORIZED"
					});
				}
				return callback();
			});
		},
		function(callback) {

			PostService.checkIfPublished(postId, function(err, alreadyPublished) {
					if (err) {
						callback(err);
					} else {
						if (alreadyPublished) {
							return callback({
								err: "Already published",
								status: 403
							});
						} else {
							return callback();
						}

					}
				});
		},

		
		function(callback) {
			PostService.publishPost(postId, function(err) {
					if (err) {
						return callback(err);
					}
						return callback();
				});
		},
		
		function(callback) {
			PostService.commitAlias(postId, function(err) {
					if (err) {
						return callback(err);
					}
						return callback();
				});
		}
	], function(err) {
		return callback(err);
	})

}

module.exports = {
	publishPost : publishPost,
	updatePost: updatePost,
	saveDraftOrPublish : saveDraftOrPublish
};
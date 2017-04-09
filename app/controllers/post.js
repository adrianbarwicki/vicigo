var async = require('async');
var hashtags = require("hashtags");
var request = require('request');
var randtoken = require('rand-token');
var moment = require('moment');
var striptags = require('striptags');

var HashtagService = require("../services/HashtagService.js");
var PostService = require("../services/PostService.js");
var UploadService = require("../services/upload.js");
var services = require("../services/services.js");
var pool = require("../../config/db.js").pool;
var rankingController = require('./ranking.js');
var commentsController = require('./comments.js');

var ImageMethods = require("../methods/ImageMethods.js");

function download(uri, params, callback) {
	request.get({
		encoding: null,
		url: uri,
	}, function(err, res, body) {

		console.log('content-type:', res.headers['content-type']);
		console.log('content-length:', res.headers['content-length']);

		return callback(err, res, body);


	});
}


function getRandomPost(userId,callback){
		var postId, Post;
		async.waterfall([
			function(callback){
				PostService.getRandom(userId,function(err,result){
					if(err){
						return callback(err);
					}
					
					postId = result.postId;
					return callback();
				});
			},
			function(callback){
				getPost(postId,{}, function(err,rPost){
					if(err){
						return callback(err);
					}
					
					Post = rPost;
					return callback();
				});
			}
		],function(err){
			callback(err,Post);
		});
		
	}

function postImageFromLink(url, options, callback) {
	ImageMethods.getFromLinkAndProcess(url, options,function(err,rImage){
		UploadService.uploadImage(rImage, function(err, savedUrl) {


					var imagePost = {};
					imagePost.post_type_id = 4;
					imagePost.owner_user_id = options.userId;
					imagePost.title = "";
					imagePost.description = "";
					imagePost.image_url = savedUrl;
					imagePost.status = 2;

					submit(imagePost, function(err, post) {
						if (err) {
							return callback(err)
						} 

							callback(err, savedUrl);

							var tags;
							var lt_tags;
							try {
								tags = options.tags;
								lt_tags = tags ? tags.split(",") : [];
							} catch (err) {
								console.log(err);
							}



							var importedContent = {
								provider: options.provider,
								post_id: post.id,
								ext_id: options.ext_id,
								owner_user_id: options.userId,
							};
						
							var sql = "INSERT imported_content SET ?"

							pool.query(sql, importedContent, function(err, result) {
								return console.log(err, result);
							});



							HashtagService.addHashtagsToPost(post.id, lt_tags, options.userId, function(err) {
								if (err) {
									console.error(err);
								}
							});


					});

				});
	});
	}

function deletePost(postId, userId, callback) {
		PostService.deletePost(postId, userId, callback);
	}

function getPosts(options, callback) {
		var sql = "SELECT id, post_type_id, title FROM posts WHERE status > 1";
		pool.query(sql, {}, function(err, result) {
			callback(err, result);
		});
	}

function updatePost(postId, postUpdate, callback) {
		if (!postId) {
			return callback("postId inital");
		}



		async.series([
			function(callback) {
				if (postUpdate.alias && postUpdate.status > 0 ) {
					var sql = "SELECT alias FROM posts WHERE id = ?";
					pool.query(sql, [postId], function(err, result) {
						if (err) {
							callback(err);
						} else {
							if (result[0].alias) {
								callback();
							} else {
								var sql = "UPDATE posts SET alias = ? WHERE id = ?";
								var values = [postUpdate.alias, postId];
								console.log(values);
								pool.query(sql, values, function(err, result) {
									if (err) {
										callback(err);
									} else {
										callback();
									}
								});
							}

						}
					});
				} else {
					callback();
				}
			},
			function(callback) {
				delete postUpdate.alias;
				var sql = "UPDATE posts SET ? WHERE id = ?";
				var values = [postUpdate, postId];
				pool.query(sql, values, function(err, result) {
					if (err) {
						callback(err);
					} else {
						callback(null, result);
					}
				});
			}
		], function(err) {
			callback(err);
		});

	}

function upvote(postId, callback) {
		PostService.changeUpvotesCount(postId,1,callback);
}

function downvote(postId, callback) {
		PostService.changeUpvotesCount(postId,-1,callback);
}

function setBackgroundPicture(postId, userId, imageUrl, callback) {
		if (!postId) {
			throw "postId inital";
		}
		if (!imageUrl) {
			throw "imageUrl inital";
		}
		var sql = "UPDATE posts SET image_url = ? WHERE id = ? AND owner_user_id = ?";
		var values = [imageUrl, postId, userId];
		pool.query(sql, values, function(err, result) {
			callback(err);
		});
	}

function submit(post, callback) {
  
						async.waterfall([
						function(callback){
							PostService.commitPost(post,function(err,rPostMin){
									return callback(err,rPostMin.postId);
							});
						},function(postId,callback){
							PostService.getPost(postId,{}, function(err, rPost) {
									if(err){
										return callback(err);
									}
								
									if(!rPost){
										return callback({status:404})
									}
								
									return callback(err,rPost)
							});
						}
					], function(err,rPost){
						return callback(err,rPost);
					});
}






function getPost(postId, options, callback) {

var post;
	
PostService.getPost(postId, options, function(err, rPost) {
		if (err) {
			return callback(err);
		}

			post = rPost;
			if (post) {
				post.post_created_at_formatted = moment(post.post_created_at).fromNow();
				post.post_created_at_formatted_calendar = moment(post.post_created_at).format("YYYY-MM-DD");
				
				if(post.post_publish_timestamp){
						post.post_publish_timestamp_formatted = moment(post.post_publish_timestamp).fromNow();
						post.post_publish_timestamp_formatted_calendar = moment(post.post_publish_timestamp).format("YYYY-MM-DD"); 
				}
			
				if (post.post_status > 0 && post.post_status < 3) {

					PostService.trackPostView(post.id, options.userId, function(err) {
						if (err) {
							console.log("PostService.trackPostView", err);
						}
					});

					PostService.addViewToPost(post.id, options.userId, function(err) {
						if (err) {
							console.log("PostService.addViewToPost", err);
						}
					});
				}

				if( ( !post.read_time || !post.language_code ) && ( Number(post.post_type_id) == 2 || Number(post.post_type_id) == 3 )  ){
					PostService.analyzePost(post.post_id);
				}
				
				async.parallel([
					function(callback) {
							post.post_body_stripped =  striptags(post.post_body);
							callback();
					},
					function(callback) {
						if (!options.userId || post.owner_user_id == options.userId) {
							callback();
							return;
						}
						services.checkIfFollowed(options.userId, post.owner_user_id, function(err, alreadyFollowed) {
							if (err) {
								callback(err);
							} else {
								post.authorFollowed = alreadyFollowed;
								callback();
							}
						});
					},

					function(callback) {
							PostService.getChildPics(post.id, {}, function(err, childPics) {
								if (err) {
									callback(err);
								} else {
									post.childPics = childPics;
									callback();
								}
							});
					},

					function(callback) {
						PostService.getRelatedPosts(post.id, {
							post_type_id: 3
						}, function(err, relatedPosts) {
							if (err) {
								callback(err);
							} else {
								post.relatedPosts = relatedPosts;
								callback();
							}
						});
					},

					function(callback) {
						PostService.getMoreFromUser(post.id, {
								limit: 6
						}, function(err, relatedPosts) {
							if (err) {
								callback(err);
							} else {
								post.sameAuthorPosts = relatedPosts;
								callback();
							}
						});
					},
					
					function(callback) {
						PostService.getRelatedPosts(post.id, {
							post_type_id: 4,
							profileRelated: true
						}, function(err, relatedPics) {
							if (err) {
								callback(err);
							} else {
								post.relatedPics = relatedPics;
								callback();
							}
						});
					},

					function(callback) {
						PostService.getPostVisitingUsers(post.id, function(err, visits) {
							if (err) {
								callback(err);
							} else {
								post.visits = visits;
								callback();
							}
						});
					},

					function(callback) {
						if (!options.userId || !post) {
							callback();
							return;
						}

						PostService.checkIfUpvoted(post.id, options.userId, function(err, alreadyUpvoted) {
							if (err) {
								callback(err);
							} else {
								post.alreadyUpvoted = alreadyUpvoted;
								callback();
							}
						});

					},

					function(callback) {
						HashtagService.getHashtagsForPost(post.id, function(err, hashtags) {
							if (err) {
								callback(err);
							} else {
								post.hashtags = hashtags;
								callback();
							}
						});
					},


					function(callback) {


						if (post.post_type_id == 2 || post.post_type_id == 3 || post.post_type_id == 4) {
							rankingController.getUpvotes(post.id, {
								limit: 10
							}, function(err, upvotes) {
								if (err) {
									console.log(err);
									callback(err);
								} else {
									if (upvotes.length) {
										post.upvotes = upvotes;
									} else {
										post.upvotes = [];
									}
									callback();
								}
							});
						} else {
							callback();
						}
					},
				], function(err) {
					callback(err, post);
				});
			} else {
				callback({
					status: 404
				});
			}

	});
}


module.exports = {
	"getRandomPost" : getRandomPost,
	"postImageFromLink": postImageFromLink,
	"deletePost": deletePost,
	"getPosts": getPosts,
	"updatePost": updatePost,
	"upvote": upvote,
	"downvote": downvote,
	"getPost": getPost,
	"setBackgroundPicture": setBackgroundPicture,
	"submit": submit,
};
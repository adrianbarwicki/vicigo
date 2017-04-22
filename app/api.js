var RateLimiter = require('limiter').RateLimiter;
var postView = new RateLimiter(120, 'minute');
var searchLimiter = new RateLimiter(50, 'minute');

var async = require('async');
var fs = require('fs');
var multer = require("multer");
var HashtagService = require("./services/HashtagService.js");
var PostService = require("./services/PostService.js");
var FeedService = require("./services/FeedService.js");
var ProfileService = require("./services/profileService.js");
var SearchService = require("./services/SearchService.js");
var FacebookService = require("./services/FacebookService.js");
var BlogService = require("./services/BlogService.js");
var services = require("./services/services.js");
var FeedController = require("./controllers/FeedController.js");
var profileController = require("./controllers/profile.js");
var postController = require("./controllers/post.js");
var commentController = require("./controllers/comments.js");
var relationshipsController = require("./controllers/relationships.js");
var rankingController = require("./controllers/ranking.js");
var historyController = require("./controllers/history.js");
var picController = require("./controllers/pic.js");
var responseController = require("./controllers/response.js");
var writeController = require("./controllers/write.js");
var pool = require("../config/db.js").pool;
var ranking = require('./controllers/ranking.js');
var isLoggedIn = responseController.isLoggedIn;
var readHeaders = responseController.readHeaders;

module.exports = function(app) {
	app.get("/api/admin/stats",function(req,res){
		profileController.getVicigoStats(function(err,rStats){
			responseController.sendResponse(res,err,rStats);
		});
	});
	
	app.get('/api/external_services/fb/fetch_photos', isLoggedIn, function(req, res) {
		var userId = req.user ? req.user.id : null;
		var sql1 = "SELECT * FROM user_networks WHERE user_id = " + userId;
		pool.query(sql1, [], function(err, result) {
			if (!result[0]) {
				return res.redirect("/auth/facebook/");
			}
			FacebookService.fetchAllPhotos(result[0].token, {
				userId: userId
			}, function(err, data) {
				responseController.sendResponse(res,err,data);
			});

		});
	});

	app.get('/api/search', function(req, res) {
				SearchService.searchWithString(req.query.q, {
					userId: req.user ? req.user.id : false
				}, function(err, results) {
					responseController.sendResponse(res,err,results);
				});
	});

	app.get('/api/posts', function(req, res) {
		postController.getPosts({}, function(err, rPosts) {
			responseController.sendResponse(res,err,rPosts);
		});
	});

	app.get("/api/draft", isLoggedIn, function(req, res) {
		services.getDraftId(req.user.id, function(err, draftId) {
			if (err) return responseController.sendResponse(res,err);

			postController.getPost(draftId, {}, function(err, rDraft) {
				responseController.sendResponse(res,err,rDraft);
			});
		});
	});

	app.get("/api/hashtag/:hashtag", function(req, res) {
		res.send({ hashtag : req.params.hashtag});
	});
	
	app.get("/api/hashtag/:hashtag/follow", isLoggedIn, function(req, res) {
		res.send();
		HashtagService.isFollowingHashtag(req.params.hashtag, req.user.id, function(err, followed) {
			return err ? console.error(err) : true;
		})
	});

	app.get("/api/profile/:profileId/hashbooks", function(req, res) {
		BlogService.fetchBlogsForProfile(req.params.profileId,req.query, function(err, rBlogs) {
			responseController.sendResponse(res, err, rBlogs);
		})
	});

	app.get("/api/hashbook/:blogSlug", function(req, res) {
		BlogService.fetchBlog(req.params.blogSlug, {
			fields: req.query.fields,
			userId: req.user ? req.user.id : null
		}, function(err, blog) {
			responseController.sendResponse(res, err, blog);
		})
	});
	app.delete("/api/hashbook/:blogSlug",isLoggedIn, function(req, res) {
		BlogService.deleteBlog(req.params.blogSlug, {
			userId: req.user.id
		}, function(err, blog) {
			responseController.sendResponse(res, err, blog);
		});
	});
	
	app.put("/api/hashbook/:blogSlug",isLoggedIn, function(req, res) {
		BlogService.updateBlog(req.params.blogSlug, req.body, {
			userId: req.user.id
		}, function(err) {
			responseController.sendResponse(res,err,{});
		})
	});


	app.post("/api/hashbook/:hashbookId/follow",isLoggedIn,function(req, res) {
		BlogService.followBlog(req.params.hashbookId, {
			userId: req.user ? req.user.id : null,
			email: req.body.email,
			source: req.query.source,
			medium: req.query.medium
		}, function(err, blog) {
			responseController.sendResponse(res,err,{});
		})
	});




	app.post("/api/hashbook",isLoggedIn, function(req, res) {
		BlogService.createBlog(req.body, {
			user_id: req.user.id
		}, function(err, blog) {
			responseController.sendResponse(res,err,blog);
		})
	});

	app.post("/api/hashtag/unfollow", isLoggedIn, function(req, res) {
		res.send();
		HashtagService.unfollowHashtag(req.body.hashtag, req.user.id, function(err) {
			return err ? console.error(err) : true;
		})
	});

	app.post("/api/hashtag/follow", isLoggedIn, function(req, res) {
		res.send();
		HashtagService.followHashtag(req.body.hashtag, req.user.id, function(err) {
			return err ? console.error(err) : true;
		})
	});

	app.post("/api/hashtag/unfollow", isLoggedIn, function(req, res) {
		res.send();
		HashtagService.unfollowHashtag(req.body.hashtag, req.user.id, function(err) {
			return err ? console.error(err) : true;
		})
	});

	app.get("/api/hashtags/trending", function(req, res) {
		HashtagService.getTrendingHashtags(req.query, function(err, rHashtags) {
			responseController.sendResponse(res,err,rHashtags);
		})
	});


	app.get('/api/feeds', responseController.readHeaders, function(req, res) {
		req.query.userId = req.user ? req.user.id : false;

		FeedController.getFeed(req.query, (err, rFeed) => {
			responseController.sendResponse(res, err, rFeed);
		});
	});

	app.put('/api/post/image/publish', isLoggedIn, function(req,res){
			PostService.activatePost(req.body.postId, function(err) {
			responseController.sendResponse(res, err);
			if(!err){
				HashtagService.addHashtagsToPost(req.body.postId,req.body.tags,req.user.id,function(err) {
					if(err){
						console.error(err);
					}
				});
			}
			});
	});
	
	app.put('/api/post/hashtags', isLoggedIn, function(req,res){
			HashtagService.addHashtagsToPost(req.body.postId,req.body.tags,req.user.id,function(err) {
				return responseController.sendResponse(res, err);
			});
	});



	app.post('/api/post/:postId/view', function(req, res) {
		postView.removeTokens(1, function(err, remainingRequests) {
			if (err) {
				res.end('429 Too Many Requests - your IP is being rate limited');
			} else {
				res.end();
				var userId = req.user ? req.user.id : null;
				PostService.addAndTrackPostView(req.params.postId, userId);
			}
		});
	});

	app.get('/api/post/:postId', readHeaders, function(req, res) {
		var userId = req.user ? req.user.id : false;
		postController.getPost(req.params.postId.toLowerCase(), {
			userId: userId,
			childPics: true
		}, function(err, post) {
			return responseController.sendResponse(res,err,post);
		});
	});

	app.delete('/api/post/:postId', responseController.isLoggedIn, function(req, res) {
		res.send();
		var postId = req.params.postId;
		postController.deletePost(postId, req.user.id, function(err, post) {
			return err ? console.error(err) : true;
		});
	});

	app.get('/api/post/:postId/views', function(req, res) {
		PostService.getPostVisitingUsers(req.params.postId, function(err, rVisits) {
							return responseController.sendResponse(res, err, rVisits);
		});
	});
	
	app.get('/api/post/:postId/upvotes', function(req, res) {
		rankingController.getUpvotes(req.params.postId, {
			limit: 30
		}, function(err, r_upvotes) {
			return responseController.sendResponse(res, err, r_upvotes);
		});
	});

	app.get('/api/post/:postId/comments/', function(req, res) {
		commentController.getComments(req.params.postId, function(err, comments) {
			return responseController.sendResponse(res, err, comments);
		});
	});

	app.post('/api/post/:postId/comments/', isLoggedIn, function(req, res) {
		var postId = req.params.postId;
		var text = req.body.body;
		var userId = req.user.id;
		commentController.postComment(postId, userId, text, function(err, insertedComment) {
			return responseController.sendResponse(res, err, insertedComment);
		});
	});

	app.delete('/api/post/:postId/comments/:commentId',isLoggedIn,function(req, res) {
			var postId = req.params.postId;
			var commentId = req.params.commentId;
			var userId = req.user.id;
			commentController.deleteComment(commentId, postId,req.user.id, function(err, insertedComment) {
				return responseController.sendResponse(res, err, insertedComment);
			});
	});

	app.get('/api/comments/:postId', function(req, res) {
		var postId = req.params.postId;
		commentController.getComments(postId, function(err, comments) {
			return responseController.sendResponse(res, err, comments);
		});
	});

	app.post('/api/post/:postId/upvote/', isLoggedIn, function(req, res) {
		ranking.upvote(req.params.postId, req.user.id, function(err) {
			return responseController.sendResponse(res, err);
		});
	});


	app.post('/api/post/:postId/downvote/', isLoggedIn, function(req, res) {
		ranking.downvote(req.params.postId, req.user.id, function(err) {
			return responseController.sendResponse(res, err);
		});
	});


	app.get('/api/upvotes/:postId', function(req, res) {
		ranking.getUpvotes(req.params.postId, {
			limit: 20
		}, function(err, result) {
			return responseController.sendResponse(res,err,result);
		});
	});


	app.get('/api/profile/:profileId', readHeaders, function(req, res) {
		profileController.getProfile(req.params.profileId, {
			userId: req.user ? req.user.id : null
		}, function(err, data) {
			return responseController.sendResponse(res,err,data);
		});
	});

	app.get('/api/profile/:profileId/hashtags', function(req, res) {
		HashtagService.getHashtagsForProfile(req.params.profileId, {
			limit: 10
		}, function(err, hashtags) {
			return responseController.sendResponse(res,err,hashtags);
		});
	});

	app.put('/api/profile/:profileId/username', isLoggedIn, function(req, res) {
			if (req.user.id !== Number(req.params.profileId)) {
				return res.status(401).send("hihihi, not funny");
			}
			ProfileService.changeUsername(req.params.profileId, req.body.username, function(err, data) {
				return responseController.sendResponse(res,err,data);
			});
	});

	app.put('/api/profile/:profileId/title', isLoggedIn, function(req, res) {
		if (req.user.id !== Number(req.params.profileId)) {
			return res.status(401).send("hihihi, not funny");
		}

		ProfileService.changeTitle(req.params.profileId, req.body.title, function(err, data) {
			return responseController.sendResponse(res,err,data);
		});
	});

	app.put('/api/profile/:profileId/website', isLoggedIn, function(req, res) {
		if (req.user.id !== Number(req.params.profileId)) {
			return res.status(401).send("hihihi, not funny");
		}

		ProfileService.changeWebsite(req.params.profileId, req.body.website, function(err, data) {
			return responseController.sendResponse(res,err,data);
		});
	});

	app.get('/api/profile/:profileId/followers', function(req, res) {
		relationshipsController.getFollowers(req.params.profileId, {
			limit: 20,
			userId: req.user ? req.user.id : null
		}, function(err, data) {
			return responseController.sendResponse(res,err,data);
		});
	});

	app.get('/api/profile/:profileId/following', function(req, res) {
		var userId = req.user ? req.user.id : null;

		relationshipsController.getFollowing(req.params.profileId, {
			limit: 20,
			userId: userId
		}, function(err, data) {
			return responseController.sendResponse(res,err,data);
		});
	});

	app.get('/api/profile/:profileId/hashtags/following', function(req, res) {
		var userId = req.user ? req.user.id : null;
		HashtagService.getFollowedHashtags(req.params.profileId, {
			limit: 50,
			userId: userId
		}, function(err, data) {
			return responseController.sendResponse(res,err,data);
		});
	});

	app.post('/api/profile/:profileId/follow/', isLoggedIn, function(req, res) {
		var rel = {
			followerId: req.user.id,
			followedId: req.params.profileId
		};

		relationshipsController.createRel(rel.followerId, rel.followedId, function(err) {
			return responseController.sendResponse(res,err);
		});

	});

	app.get('/api/profile/:profileId/drafts/', function(req, res) {
		PostService.getDrafts(req.params.profileId, {
			post_type_id: req.query.post_type_id
		}, function(err, drafts) {
			return responseController.sendResponse(res,err);
		});
	});

	app.get('/api/profile/:profileId/recommended/accounts', function(req, res) {
		profileController.getRecommendedProfiles(req.params.profileId, {}, function(err, rProfiles,sql) {
			if(err){
				err.sql = sql;
			}
			return responseController.sendResponse(res,err,rProfiles);
		});
	});
	

	app.post('/api/profile/:profileId/unfollow/', isLoggedIn, function(req, res) {
		var followerId = req.user.id;
		var followedId = req.params.profileId;
		relationshipsController.destroyRel(followerId, followedId, function(err) {
			return responseController.sendResponse(res,err);
		});
	});




	app.post("/api/post/image/from_link", isLoggedIn, function(req, res) {
		postController.postImageFromLink(req.body.source, {
			userId: req.user.id,
			tags: req.body.tags,
			ext_id: req.body.ext_id,
			provider: 'facebook'
		}, function(err, body) {
			responseController.sendResponse(res,err,body);
		});
	});


	app.post('/api/update/:id',isLoggedIn,function(req, res) {

		var postUpdate = {};
		var sql = "SELECT post_type_id FROM posts WHERE id = ?";
		pool.query(sql, [req.params.id], function(err, result) {
			if (err) {
				console.error(err);
				responseController.sendResponse(res,err);
			} else {

				if (result.length) {
					if (result[0].post_type_id == 3) {
						postUpdate.title = req.body.title;
					}
					postUpdate.hashtags = req.body.hashtags;
					try {
						postUpdate.hashtags = postUpdate.hashtags.split(",");
					} catch (err) {
						console.log(err);
						postUpdate.hashtags = [];
					}

					postUpdate.body = req.body.body;

					writeController.saveDraftOrPublish(req.params.id, req.user.id, 2, postUpdate, function(err, data) {
						responseController.sendResponse(res,err,data);
					});
				} else {
					res.status(404).render("404.ejs");
				}
			}
		});



	});


	app.get('/api/drafts/', isLoggedIn, function(req, res) {
		PostService.getDrafts(req.user.id, function(err, data) {
			responseController.sendResponse(res,err,data);
		});
	});

	app.put('/api/post/:postId/unpublish/', isLoggedIn, function(req, res) {
		PostService.unpublishPost(req.params.postId, req.user.id, function(err, data) {
			responseController.sendResponse(res,err,data);
		});

	});

	app.post('/api/publish/:id', isLoggedIn, function(req, res) {
		var postUpdate = {};
		postUpdate.title = req.body.title;
		postUpdate.hashtags = req.body.hashtags;
		postUpdate.body = req.body.body;
		try {
			postUpdate.hashtags = postUpdate.hashtags.split(",");
		} catch (err) {
			postUpdate.hashtags = [];
		}

		writeController.saveDraftOrPublish(req.params.id, req.user.id, 1, postUpdate, function(err, data) {
			return responseController.sendResponse(res,err,data);
		});
	});



	app.put('/api/draft/:draftId/publish', isLoggedIn, function(req, res) {
		writeController.publishPost(req.params.draftId, req.user.id, function(err, data) {
			return responseController.sendResponse(res, err);
		});
	});

	app.put("/api/draft/:draftId/title", isLoggedIn, function(req, res) {
		writeController.updatePost(req.params.draftId, req.user.id, {
			title: req.body.title
		}, function(err) {
			return responseController.sendResponse(res, err);
		});
	});



	app.put("/api/draft/:draftId/body", isLoggedIn, function(req, res) {
		writeController.updatePost(req.params.draftId, req.user.id, {
			body: req.body.body
		}, function(err) {
			return responseController.sendResponse(res, err);
		});
	});

	app.put("/api/draft/:draftId/hashtags", isLoggedIn, function(req, res) {
		writeController.updatePost(req.params.draftId, req.user.id, {
			hashtags: req.body.hashtags
		}, function(err) {
			return responseController.sendResponse(res, err);
		});
	});

	app.get('/api/notifications/status', isLoggedIn, function(req, res) {
		profileController.getUserStatus(req.user.id, function(err, status) {
			return responseController.sendResponse(res, err, status);
		});
	});

	app.get('/api/notifications', isLoggedIn, function(req, res) {
		historyController.getNotificationsForUser(req.user.id, {
			limit: req.query.limit,
			page: req.query.page
		}, function(err, notifications) {
			responseController.sendResponse(res, err, notifications);
		});
	});
	app.put('/api/notifications/read_all', isLoggedIn, function(req, res) {
		res.end();
		historyController.markAllNotificationsAsRead(req.user.id);
	});

	app.put('/api/notifications/read_one/:id', isLoggedIn, function(req, res) {
		res.end();
		historyController.markNotificationAsRead(req.params.id, {
			user_id: req.user.id
		}, function(err) {
			return err ? console.error(err) : true;
		});
	});


	app.get('/api/post/:username/:alias', function(req, res) {
		var userId = req.user ? req.user.id : false;
		postController.getPost(null, {
			userId: userId,
			childPics: true,
			username: req.params.username,
			alias: req.params.alias
		}, function(err, post) {
			if (err) {
				res.status(500).send(err);
			} else {
				if (post.status === 0 || post.status == 9) {
					res.status(404).send("NOT FOUND");
				} else {
					res.status(200).send(post);
				}
			}
		});
	});

	app.post('/upload/image', isLoggedIn, multer().single('file'), function(req, res) {
		if (!req.file) {
			return res.status(403).send('expect 1 file upload named file1').end();
		}
			
		async.waterfall([
			callback => {
				picController
				.processAndSaveImage(req.file, {
					userId: req.user.id,
					noCrop : req.query.postId
				}, (err, rPost) => {
					return callback(err, rPost);
				});
			},
			(Post, callback) => {
				if (req.query.postId && req.query.isBackground) {
					postController
					.setBackgroundPicture(req.query.postId, req.user.id, Post.image_bg_url, err => {
						return callback(err, Post);
					});
				} else if (req.query.hashbookId && req.query.isBackground) {
					BlogService
					.setBackgroundPicture(req.query.postId, req.user.id, Post.image_bg_url, err => {
						return callback(err, Post);
					});
				} else if (req.query.isProfileAvatar) {
					profileController
					.setProfileImage(req.user.id, Post.image_avatar_url, err => {
						return callback(err,Post);
					});
				} else {
					if (req.query.postId) {
						Post.parent_id = req.query.postId;
						Post.post_type_id = 5;
					} else {
						Post.post_type_id = 4;
					}
						
					Post.owner_user_id = req.user.id;

					Post.status = 0;

					postController.submit(Post, (err,rPost) => {
						return callback(err, Post, rPost);
					});
				}
			}
		], (err, Image, rPost) => {
			if (err) {
				return responseController.sendResponse(res,err);
			}

			responseController.sendResponse(res, err, {
				postId: rPost ? rPost.post_id : false,
				link: Image ? Image.image_url : ''
			});
		});
	});
};
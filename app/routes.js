var async = require('async');

var services = require("./services/services.js");
var HashtagService = require("./services/HashtagService.js");
var BlogService = require("./services/BlogService.js");
var PostService = require("./services/PostService.js");
var FeedService = require("./services/FeedService.js");
var profileController = require("./controllers/profile.js");
var postController = require('./controllers/post.js');
var responseController = require('./controllers/response.js');
var SeoService = require("./services/SeoService.js");
var isLoggedIn = responseController.isLoggedIn;
var isBot = responseController.isBot;

module.exports = function(app, passport) {

	app.get("/", function(req, res) {
		if (isBot(req.headers['user-agent'],req.query.crawler_view)) {
			HashtagService.getTrendingHashtags({
				limit: 30
			}, function(err, hashtags) {
				res.render('welcomeBody.ejs', {
					layout: 'layouts/crawlerLayout',
					hashtags: hashtags,
					SEO: SeoService.getDefault(),
				});
			})
		} else {
			res.sendfile("app.html", {
				root: __dirname + "/../public"
			});
		}
	});


	app.get("/hashtag/:hashtag", function(req, res) {
			if (isBot(req.headers['user-agent'],req.query.crawler_view)) {
			FeedService.getFeed({
				hashtag: req.params.hashtag,
				sort: "best",
				limit: 50
			}, function(err, feeds) {
				res.render('hashtagBody.ejs', {
					layout: 'layouts/crawlerLayout',
					feeds: feeds,
					hashtag: req.params.hashtag,
					SEO: SeoService.getForHashtag(req.params.hashtag),
				});
			})
		} else {
			res.sendfile("app.html", {
				root: __dirname + "/../public"
			});
		}
	});


	app.get("/post/:username/:alias", function(req, res) {
			if (isBot(req.headers['user-agent'],req.query.crawler_view)) {
				
			postController.getPost(req.params.postId, { username: req.params.username, alias : req.params.alias }, function(err, post) {
				if(err){
					console.error(err);
					res.status(500).send(err);
					return;
				}
				if(!post){
					res.status(404).render("404.ejs");
					return;
				}
				res.render('postBody.ejs', {
					layout: 'layouts/crawlerLayout',
					SEO: SeoService.getForPost(post),
					feed: post,
				});
			});
		} else {
			res.sendfile("app.html", {
				root: __dirname + "/../public"
			});
		}
	});
	
	app.get("/post/:postId", function(req, res) {
			if (isBot(req.headers['user-agent'], req.query.crawler_view)) {
			postController.getPost(req.params.postId, {}, function(err, post) {
				if(err){
					console.error(err);
					res.status(500).send(err);
					return;
				}
				if (!post) {
					res.status(404).render("404.ejs");
					return;
				}
				res.render('postBody.ejs', {
					layout: 'layouts/crawlerLayout',
					SEO: SeoService.getForPost(post),
					feed: post,
				});
			});
		} else {
			res.sendfile("app.html", {
				root: __dirname + "/../public"
			});
		}
	});

	app.get("/profile/:profileId", function(req, res) {
				if (isBot(req.headers['user-agent'],req.query.crawler_view)) {

			profileController.getProfile(req.params.profileId, {}, function(err, profile) {
				if (profile) {
					FeedService.getFeed({
						hashtag : req.query.hashtag ? req.query.hashtag : null,
						profileId: profile.user_id,
						sort: "new",
						limit: 50
					}, function(err, feeds) {
						res.render('profileBody.ejs', {
							layout: 'layouts/crawlerLayout',
							SEO: SeoService.getForProfile(profile),
							profile: profile,
							feeds: feeds ? feeds : []
						});
					});
				} else {
					res.status(404).render("404.ejs");
				}
			});
		} else {
			res.sendfile("app.html", {
				root: __dirname + "/../public"
			});
		}
	});
	
	app.get("/hashbook/:hashbookIdentifier", function(req, res) {
		if (isBot(req.headers['user-agent'],req.query.crawler_view)) {
			BlogService.fetchBlog(req.params.hashbookIdentifier, {}, function(err, hashbook) {
				if (hashbook) {

						res.render('hashbookBody.ejs', {
							layout: 'layouts/crawlerLayout',
							SEO: SeoService.getForHashbook(hashbook),
							hashbook: hashbook,
						});
				} else {
					res.status(404).render("404.ejs");
				}
			});
		} else {
			res.sendfile("app.html", {
				root: __dirname + "/../public"
			});
		}
	});

	app.get('/impressum', function(req, res) {
		res.render('impressum.ejs', {
			layout: 'bin',
			user: req.user,
		});
	});

	app.get('/privacy', function(req, res) {
		res.render('privacy.ejs', {
			layout: 'bin',
			user: req.user,
		});
	});

	app.get('/terms', function(req, res) {
		res.render('terms.ejs', {
			layout: 'bin',
			user: req.user,
		});
	});

	app.get('/sitemap', function(req, res) {
		PostService.getAllPosts(req.query, function(err, posts) {
			res.render('sitemap.ejs', {
				layout: 'bin',
				user: req.user,
				posts: posts
			});
		})
	});
	
	app.get('/sitemap/hashbooks', function(req, res) {
		BlogService.getHashbooks(req.query, function(err, hashbooks) {
			res.render('sitemap-hashbooks.ejs', {
				layout: 'bin',
				user: req.user,
				hashbooks: hashbooks
			});
		})
	});
	
	app.get('/sitemap/hashtags', function(req, res) {
		HashtagService.getTrendingHashtags({
			limit: 2000
		}, function(err, hashtags) {
			res.render('hashtags.ejs', {
				layout: 'bin',
				user: req.user,
				hashtags: hashtags
			});
		})
	});
};


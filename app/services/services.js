var async = require('async');
var pool = require("../../config/db.js").pool;

module.exports = {
	"addPoints" : function(user_id, points_count, callback) {
		console.log("[INFO] Adding",points_count, "points to user", user_id);
		var sql = "UPDATE user_profile SET points_count = points_count + ? WHERE user_id = ?";
		var values = [points_count, user_id];
		pool.query(sql, values, function(err, result) {
			if (err){
				callback(err);
				console.error(err);
			} else {
				callback();
			}
		});
	},
	'checkIfEmailsWanted': function(user_id, callback) {
		var sql = "SELECT * FROM user_subscriptions WHERE user_id = ?";
		pool.query(sql, [user_id], function(err, result) {
			if (err) {
				callback(err);
			} else {
				if (result.length) {
					callback(null, false);
				} else {
					callback(null, true);
				}
			}
		});
	},
	'countStories': function(post_type_id, user_id, category_id, callback) {


		var values = [];
		var query = "SELECT COUNT(*) AS stories_count FROM posts WHERE status > 0";

		if (post_type_id) {
			query += " AND post_type_id = ?";
			values.push(post_type_id);
		}
		if (user_id) {
			query += " AND owner_user_id = ?";
			values.push(user_id);
		}

		if (category_id) {
			query += " AND category_id = ?";
			values.push(category_id);
		}


		pool.query(query, values, function(err, result) {
			if (err) {
				console.error(err);
				callback(err);
			} else {
				if (result.length) {
					callback(null, result[0].stories_count);
				} else {
					callback(null, 0);
				}

			}
		});

	},


	'countEvents': function(user_id, options, callback) {
		var query = "SELECT COUNT(*) AS events_count FROM history WHERE user_id = ?";

		pool.query(query, [user_id], function(err, result) {
			if (err) {
				console.error(err);
				callback(err);
			} else {
				if (result.length) {
					callback(null, result[0].events_count);
				} else {
					callback(null, 0);
				}
			}
		});
	},


	'checkIfFollowed': function(followerId, followedId, callback) {
		if (!followerId || !followedId) {
			callback("initial fields");
			return;
		} 
			var query = "SELECT * FROM user_followers WHERE user_id = ? AND follower_id = ?";
			var values = [followerId, followedId];
			pool.query(query, values, function(err, result) {
				if (err) {
					callback(err);
				} else {
					if (result.length) {
						callback(null, true);
					} else {
						callback(null, false);
					}

				}
			});
	},

	'checkIfAlreadyUpvoted': function(postId, userId, callback) {
		//console.log("[SERVICES] Checking if already upvoted", postId, userId);
		var sql = "SELECT *  FROM votes WHERE user_id = ? AND post_id = ?";
		var values = [userId, postId];
		pool.query(sql, values, function(err, result) {
			if (err) {
				callback(err);
			} else {
				console.log(result);
				if (result.length) {
					callback(null, true);
				} else {
					callback(null, false);
				}
			}
		});
	},

	'checkIfAlreadyAnswered': function(questionId, userId, callback) {
		//console.log("[SERVICES] Checking if already answered");
		var sql = "SELECT COUNT(*) as answers_count FROM posts WHERE owner_user_id = ? AND parent_id = ?";
		var values = [userId, questionId];
		pool.query(sql, values, function(err, result) {
			if (err) {
				callback(err);
			} else {
				console.log(result);
				if (result.length) {
					callback(null, (result[0].answers_count > 0) ? true : false);
				} else {
					callback({
						err: "notAllowed",
						msg: "Does not exists"
					});
				}
			}
		});
	},

	'checkIfPostBelongsToUser': function(postId, userId, callback) {

		//console.log("[SERVICES] Checking if post belongs to user");
		var sql = "SELECT id FROM posts WHERE owner_user_id = ? AND id = ?";
		var values = [userId, postId];
		pool.query(sql, values, function(err, result) {
			if (err) {
				console.error(err);
				callback(err);
			} else {
				if (result.length) {
					callback(null, true);
				} else {
					callback(null, false);
				}
			}

		});
	},

	'checkIfAlreadyPublished': function(postId, callback) {
		console.log("[SERVICES] Checking if post has been already published");
		var sql = "SELECT status FROM posts WHERE id = ?";
		var values = [postId];
		pool.query(sql, values, function(err, result) {
			if (err) {
				console.log(err);
				callback(err);
			} else {
				if (result.length) {
					if (result[0].status > 0) {
						callback(null, true);
					} else {
						callback(null, false);
					}
				} else {
					callback(null, false);
				}
			}
		});
	},


	'escapeHTML': function(str) {
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	},

	'removeSpecialChars': function(string) {
		return string.replace(/[^a-zA-Z ]/g, "").replace("/ /", "-");
	},


	'findCategory': function(categories, id) {

		for (var index = 0; index < categories.length; index++) {
			if (categories[index].id == id) return categories[index];
		}
		return false;
	},


	'getPost': function(IdOrUrl, callback) {
		MongoClient.connect(mongoUrl, function(err, db) {
			var Posts = db.collection('posts');
			var id = new ObjectID(IdOrUrl);
			Posts.findOne({
				_id: id
			}, function(err, item) {
				if (err) {
					console.log(err);
				}

				callback(err, item);
			});
		});
	},


	'getQuestion': function(questionId, callback) {
		MongoClient.connect(mongoUrl, function(err, db) {
			var Questions = db.collection('questions');
			var id = new ObjectID(questionId);
			Questions.findOne({
				_id: id
			}, function(err, item) {
				if (err) {
					console.log(err);
				}

				callback(err, item);
			});
		});
	},


	'getAuthor': function(userId, callback) {

		MongoClient.connect(mongoUrl, function(err, db) {

			var Users = db.collection('users');
			var id = new ObjectID(userId);
			Users.findOne({
				_id: id
			}, function(err, user) {
				console.log(user);
				callback(err, user);
			});
		});
	},

	'getMoreFromAuthor': function(name, limit, skipUrlOrId, callback) {
		MongoClient.connect(mongoUrl, function(err, db) {
			if (err) {
				console.error("Error connecting to database");
				console.error(err);
			} else {
				var Id = new ObjectID(skipUrlOrId);
				var Posts = db.collection('posts');
				Posts.find({
					$and: [{
							author: name
						}, {
							_id: {
								$ne: Id
							}
						}

					]
				}).limit(limit).toArray(function(err, docs) {
					callback(err, docs);
				});
			}
		});
	},






	'getLastPosts': function(limit, category, skipId, callback) {
		MongoClient.connect(mongoUrl, function(err, db) {
			var Posts = db.collection('posts');

			var Id = (skipId) ? new ObjectID(skipId) : null;


			var options = {};
			if (category) {
				options.$and = [{
					category: category
				}, {
					_id: {
						$ne: Id
					}
				}];
			} else {
				options = {
					_id: {
						$ne: Id
					}
				};
			}

			Posts.find(options).sort({
				date: -1
			}).limit(limit).toArray(function(err, docs) {
				callback(err, docs);
			});
		});
	},

	'chunk': function(arr, len, gapForAds) {
		var chunks = [];
		if (!arr) {
			console.error("ERROR | CHUNK SPLITTING: Arr not defined");
			return chunks;
		}
		if (arr.length > 0) {

			if (gapForAds) {
				var firstChunk = [];
				firstChunk.push(arr[0]);
				chunks.push(firstChunk);
				arr.shift();
			}

			var i = 0,
				n = arr.length;
			while (i < n) {
				chunks.push(arr.slice(i, i += len));
			}
		}
		return chunks;
	},

	'getDraftId': function(authorId, callback) {
		console.log("[SERVICES] Getting draft ID");
		var sql = "SELECT * FROM posts WHERE owner_user_id = ? AND post_type_id = 3 AND status = 0";
		var value = [authorId];
		pool.query(sql, value, function(err, result) {
			if (err) {
				callback(err);
			} else {
				if (result.length) {
					console.log("[SERVICES] Draft found. Returning ID.");
					callback(null, result[0].id);
				} else {
					console.log("[SERVICES] Draft not found. Creating new draft.");
					var post = {};
					post.post_type_id = 3;
					post.status = 0;
					post.owner_user_id = authorId;
					post.created_at = new Date();
					var sql2 = "INSERT INTO posts SET ?";
					pool.query(sql2, post, function(err, insertedPost) {
						if (err) {
							callback(err);
						} else {
							if (insertedPost.insertId) {
								console.log("[SERVICES] New draft created. Returning.");
								callback(null, insertedPost.insertId);
							} else {
								callback("Id not generated after succesful insert");
							}
						}
					});
				}
			}
		});





	},

	"initializeAnswer": function(questionId, authorId, callback) {

		console.log(questionId);
		console.log(authorId);



		MongoClient.connect(mongoUrl, function(err, db) {
			var Posts = db.collection('posts');
			var Questions = db.collection('questions');
			var post = {};
			questionId = new ObjectID(questionId);
			Questions.findOne({
				_id: questionId
			}, function(err, question) {
				if (question) {
					post.type = "Answer";
					post.authorId = authorId;
					post.questionId = questionId;
					post.category = question.category;
					post.body = "";
					post.timestamp = new Date();
					Posts.insert(post, function(err, doc) {
						console.log(doc);
						callback(err, doc);
					});

				} else {
					callback({
						err: "Question does not exist!"
					});
				}


			});


		});
	},





};


var getSimiliarStories = function(category, callback) {
	MongoClient.connect(mongoUrl, function(err, db) {
		if (err) {
			console.error("Error connecting to database");
			console.log(err);
			callback(null, []);
		} else {
			var Posts = db.collection('posts');
			Posts.find({
				category: category
			}).limit(4).toArray(function(err, docs) {
				if (err) {
					console.error("Error retrieving similiar stories in the category:", category);
					console.error(err);
					docs = [];
				}
				callback(null, docs);
			});
		}
	});

};
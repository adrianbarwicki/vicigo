var async = require('async');
var striptags = require('striptags');
var hashtags = require('hashtags');
var slug = require('slug');
var striptags = require('striptags');

var sirbz = require('../modules/sirbz-analytics.js');
var pool = require('../../config/db.js').pool;


var historyController = require('../controllers/history.js');


var activatePost = function(postId, callback) {

	if (!postId) {
		return callback({code:"INITIAL_ARGUMENTS",status:400});
	}

	var sql = "UPDATE posts SET status = 2 WHERE id = ?";
	pool.query(sql, [postId], function(err, result) {
		callback(err, result);
	});
};



var createShortLinkToPost = function(postId,params,callback){
	var post={},short_url;
	async.waterfall([
		function(callback){
	var sql = "SELECT post.alias AS post_alias, post.short_link AS short_link, profile.name AS username  FROM posts as post INNER JOIN user_profile AS profile ON profile.user_id = post.owner_user_id WHERE post.id = ?";
	pool.query(sql, [postId], function(err, result) {
		if(err){
			return callback(err);
		}
		if(result.length){
			post = result[0];
			return callback();
		} else {
			return callback("Post not found");
		}
		
	});
		},
		function(callback){
			var long_url;

			if(post.post_alias){
					long_url = "http://vicigo.com/post/"+post.username+"/"+post.post_alias;
			} else {
					long_url = "http://vicigo.com/post/"+postId;
			}
			
			sirbz.urlShortener(long_url,{},function(err,result){
				if(err){
					return callback(err);
				}
				short_url = result.short_url;
				callback();
			})
		},
		function(callback){
			var sql = "UPDATE posts SET short_link = ? WHERE id = ?";
	pool.query(sql, [short_url,postId], function(err, result) {
		if(err){
			return callback(err);
		}
		callback(err);
	});
		},
		
	],function(err){
		if(err){
			return callback ? callback(err) : console.error(err);
		}

		return	callback(null,{short_link : short_url});
	
	});
};	

var analyzePost = function(postId,params,callback){
	
	var text,analysis = {};
	async.waterfall([
		function(callback){
	var sql = "SELECT body FROM posts WHERE id = ? AND ( post_type_id = 2 OR post_type_id = 3 ) ";
	pool.query(sql, [postId], function(err, result) {
		if(err){
			return callback(err);
		}
		if(result.length){
			text = result[0].body;
			return callback();
		} else{
			return callback("Post not found");
		}
		
	});
		},
		function(callback){
			sirbz.textAnalytics(text,function(err,textAnalytics){
				if(err){
					return callback(err);
				}
				
				if(!textAnalytics){
					return callback({code:"NOT_ANALYZED"});
				}
				
				analysis = textAnalytics;
				delete analysis.row_text;
				callback();
			})
		},
		function(callback){
			if(analysis.read_time){
				pool.query("UPDATE posts SET read_time = ? WHERE id = ?", [analysis.read_time,postId]);
			}
			if(analysis.language){
				if(analysis.language.code){
					pool.query("UPDATE posts SET language_code = ? WHERE id = ?", [analysis.language.code,postId]);
				}
			}
			setTimeout(callback,100);
		},
		
	],function(err){
		if(err){
			return callback ? callback(err) : console.error(err);
		}
		
		return callback ? callback(err) : true;
	});
};

var getAllPosts = function(params, callback) {
	
	
	
	var sql = "SELECT ";
	sql += " post.post_type_id AS post_type_id, post.title AS title, profile.name AS author_username,";
	sql += " ( CASE WHEN ( post.post_type_id  = 2 OR post.post_type_id  = 3 ) THEN CONCAT('http://vicigo.com/post/', profile.name,'/', post.alias) ELSE CONCAT('http://vicigo.com/post/', post.id) END ) AS link";
	sql += " FROM posts as post";
	sql += " INNER JOIN user_profile AS profile ON profile.user_id = post.owner_user_id ";
	sql += " WHERE post.status = 1 OR post.status = 2 ORDER BY created_at DESC";


	
	
	pool.query(sql, [], function(err, result) {
		if (err) {
			console.log(err);
			callback(err);
		} else {
			callback(err, result);
		}

	});
};

var unpublishPost = function(postId, userId, callback) {

	if (!postId || !userId) {
		callback("postId or userid initial");
	}

	var sql = "UPDATE posts SET status = 0 WHERE id = ? AND owner_user_id = ?";
	var values = [postId, userId];
	pool.query(sql, values, function(err, result) {
		callback(err, result);
	});
};

var getDrafts = function(userId,params, callback) {

	if (!userId) {
		callback("userid initial");
	}
	
	params.post_type_id = params.post_type_id ? params.post_type_id : 3;
	var sql = "SELECT * FROM posts WHERE status = 0 AND owner_user_id = ? AND post_type_id = ?";
	var values = [userId,params.post_type_id];
	pool.query(sql, values, function(err, result) {
		if(err){
			console.log(err);
			callback(err);
		}else{
			callback(err, result);
		}
		
	});
};

var addViewToPost = function(postId, userId, callback) {
	var sql, values = [];
	if (userId) {
		sql = "UPDATE posts SET views = views + 1 WHERE id = ? AND NOT owner_user_id = ?";
		values = [postId, userId];
	} else {
		sql = "UPDATE posts SET views = views + 1 WHERE id = ?";
		values = [postId];
	}

	pool.query(sql, values, function(err, result) {
		if(err) {
		return callback(err);
		} else {
			callback();
			historyController.viewTresholdEmail(postId,function(err){return err ? console.log(err) : true;});
		}
		
	});
};

var trackPostView = function(postId, userId, callback) {
	if (userId) {
		var sql = "INSERT INTO post_view_tracking SET post_id = ?, user_id = ?";
		var values = [postId, userId];

		pool.query(sql, values, function(err, result) {
			return callback(err);
		});
	} else {
			return callback();
	}

};

var addAndTrackPostView = function(postId,userId){
	if(!postId){
		return console.log("addAndTrackPostView - postId missing");
	}
	addViewToPost(postId,userId,function(err){ return err ? console.log(err) : true; });
	trackPostView(postId,userId,function(err){ return err ? console.log(err) : true; });
}

var getPostVisitingUsers = function(postId, callback) {
	var sql = "SELECT profile.user_id, profile.name, profile.profile_image_url FROM user_profile AS profile";
	sql += " INNER JOIN user AS user ON user.id = profile.user_id" 
	sql += " WHERE"
	sql += " user.status = 0" 
	sql += " AND profile.user_id IN" 
	sql += " ( SELECT user_id FROM post_view_tracking WHERE post_id = ?)";
	sql += " AND";
	sql += " NOT user_id IN ( SELECT owner_user_id FROM posts WHERE id = ? )";
	pool.query(sql, [postId, postId], function(err, result) {
		return callback(err, result);
	});
};





var getMoreFromUser = function(postId,options,callback){
	
	options = (options) ? options : {};
	options.limit = (options.limit) ? options.limit : 6;
	
	var values = [];
	var sql = "SELECT DISTINCT"
	sql += " post.id as post_id, post.title as title, post.image_url as image_url, profile.name AS author_name, profile.user_id AS author_id,"
	sql += " ( CASE WHEN ( post.post_type_id  = 2 OR post.post_type_id  = 3 ) THEN CONCAT('http://vicigo.com/post/', profile.name,'/', post.alias) ";
	sql += " ELSE CONCAT('http://vicigo.com/post/', post.id) END ) AS link";
	sql += " FROM posts as post";
	sql += " INNER JOIN user_profile AS profile ON profile.user_id = post.owner_user_id";
	sql += " INNER JOIN user AS user ON user.id = profile.user_id" 
	sql += " WHERE user.status = 0 AND post.owner_user_id IN ";
	sql += " ( SELECT owner_user_id FROM posts WHERE id = ? )";
	values.push(postId);
	sql += " AND  ( post.post_type_id = 2 OR post.post_type_id = 3 )";
	sql += " AND NOT post.id = ? AND post.status > 0 AND post.status < 3";
	values.push(postId);
	sql += " ORDER BY post.created_at DESC LIMIT ?";
	values.push(options.limit);


	var relatedPosts = [], index = 0;
	async.waterfall([
		function(callback){
			pool.query(sql, values, function(err, result) {
				if(err){
					callback(err);
				} else{
					relatedPosts = result;
					callback(err);
				}
			});
		},
		
		 function(callback){
	
			var index = 0;
			async.eachSeries(relatedPosts,function(relatedPost,callback){
				var sql2 = "SELECT hashtag FROM hashtag_posts WHERE post_id = ?";
				pool.query(sql2, [relatedPost.post_id], function(err, result) {
					if(err){
						callback(err);
					} else{
						relatedPosts[index].hashtags = result;
						index = index + 1;
						callback();
					}
				});
			}, function(err){
				callback(err);
			});
		} 
	],function(err){
		callback(err, relatedPosts);
	});
	
	
};

var getRelatedPosts = function(postId,options,callback){
	
	options = (options) ? options : {};
	options.limit = (options.limit) ? options.limit : 6;
	options.sameAuthorPosts = (options.sameAuthorPosts) ? options.sameAuthorPosts : false;
	var values = [];
	var sql = "SELECT DISTINCT"
	sql += " post.id as post_id, post.title as title, post.image_url as image_url, profile.name AS author_name, profile.user_id AS author_id, ";
	sql += " ( CASE WHEN ( post.post_type_id  = 2 OR post.post_type_id  = 3 ) THEN CONCAT('http://vicigo.com/post/', profile.name,'/', post.alias) ";
	sql += " ELSE CONCAT('http://vicigo.com/post/', post.id) END ) AS link";
	sql += " FROM posts as post";
	sql += " INNER JOIN user_profile AS profile ON profile.user_id = post.owner_user_id";
	sql += " INNER JOIN user AS user ON user.id = profile.user_id" 
	sql += " WHERE user.status = 0 AND ( post.status = 1 OR post.status = 2 ) AND post.id IN";
	sql += " ( SELECT post_id FROM hashtag_posts WHERE hashtag IN";
	sql += " ( SELECT hashtag FROM hashtag_posts WHERE post_id = ? ) )";
	values.push(postId);
	

	
	if(options.profileRelated){
		sql += " AND post.owner_user_id IN ( SELECT owner_user_id FROM posts WHERE id = ? )";
		values.push(postId);
	}
	
	if( options.post_type_id == 4 ) {
		sql += " AND  ( post.post_type_id = 4 )";
	} else {
		sql += " AND  ( post.post_type_id = 2 OR post.post_type_id = 3 )";
	}
	sql += " AND  NOT post.id = ? AND post.status > 0 AND post.status < 3";
	values.push(postId);

	sql += " ORDER BY post.upvotes_count  DESC LIMIT ?";
	values.push(options.limit);
	

	var relatedPosts = [], index = 0;
	async.waterfall([
		function(callback){
			pool.query(sql, values, function(err, result) {
				if(err){
					callback(err);
				} else{
					relatedPosts = result;
					callback(err);
				}
			});
		},
		
		 function(callback){
	
			var index = 0;
			async.eachSeries(relatedPosts,function(relatedPost,callback){
				var sql2 = "SELECT hashtag FROM hashtag_posts WHERE post_id = ?";
				pool.query(sql2, [relatedPost.post_id], function(err, result) {
					if(err){
						callback(err);
					} else{
						relatedPosts[index].hashtags = result;
						index = index + 1;
						callback();
					}
				});
			}, function(err){
				callback(err);
			});
		} 
	],function(err){
		callback(err, relatedPosts);
	});
	
	
};
/*

*/
var getRelatedPostsBasedOnIntrest = function(postId,options,callback){
	
		var values = [];
		var sql = [];
	
		sql.push("SELECT DISTINCT id as post_id, title as title, image_url as image_url,");
		sql.push("(SELECT DISTINCT COUNT(hp.hashtag)");
		sql.push("FROM hashtag_posts as hp");
		sql.push("INNER JOIN");
		sql.push("(select hashtag as hashtag, count(hashtag) as count from hashtag_posts WHERE post_id = ?") ;
		values.push(postId);		
		sql.push("ON hp.hashtag = uh.hashtag");
		sql.push("INNER JOIN posts as ps ON ps.id = hp.post_id");
		sql.push("where hp.post_id = post.id ) as interestness");
		sql.push("FROM posts");

		sql.push("WHERE");
		sql.push(" AND  ( post.post_type_id = 4 )");
		sql.push(" AND  post.id = ? AND post.status > 0 AND post.status < 3");

		values.push(postId);		
		sql.push(" ORDER BY interestness DESC LIMIT 3");
		sql = sql.join(" ");
		pool.query(sql, [values], function(err, result) {
			callback(err, result);
		});
	
};
var getChildPics = function(postId,options,callback){
	
		var values = [];
		var sql = [];
	
		sql.push("SELECT id AS post_id, image_url AS image_url");
		sql.push("FROM posts as post");
		sql.push("WHERE");
		sql.push("post.post_type_id = 5 AND post.parent_id = ?");
		sql.push("AND post.status > 0 AND post.status < 3");
		values.push(postId);		
		sql = sql.join(" ");

		pool.query(sql,values, function(err, result) {
				callback(err, result);
		});
	
};

var postQuickThought = function(body,userId,options,callback){
	

	var thought = {
		body : body,
		post_type_id : 6,
		owner_user_id : userId
	};
	
		var sql = "INSERT INTO posts SET ?";

		pool.query(sql,thought, function(err, result) {	
			if(err){
				callback(err);
			} else{
				callback(null, {postId :  result.insertId });
			}
		});
	
};


var checkIfPostOwner = function(postId,ownerUserId,callback){
	if(!postId||!ownerUserId){
		return callback({code:"INITIAL_ARGUMENTS",status:400});
	}
	
		var sql = "SELECT id, owner_user_id FROM posts WHERE id = ? AND owner_user_id = ?";
		pool.query(sql,[postId,ownerUserId], function(err, result) {	
			if(err){
				return callback(err);
			} else {
				if(result.length){
						return callback(null,result[0].owner_user_id == ownerUserId ? true : false);
				}else{
						return callback(null, false);
				}
			}
		});
};

var updatePostTitle = function(postId,ownerUserId,title,callback){
	
	try{
		title = striptags(title);
	} catch (err) {
		console.error("Could not slug title");
		return callback({ code : 400, message: "Could not slug title"});
	}
		
		var sql = "UPDATE posts SET title = ? WHERE id = ? AND owner_user_id = ?";
		pool.query(sql,[title,postId,ownerUserId], function(err, result) {	
			if(err){
				callback(err);
			} else {
				return callback(null, { postId :  postId });
			}
		});
};

var updatePostBody = function(postId,ownerUserId,body,callback){
		var sql = "UPDATE posts SET body = ? WHERE id = ? AND owner_user_id = ?";
		pool.query(sql,[body,postId,ownerUserId], function(err, result) {	
			if(err){
				callback(err);
			} else {
				return callback(null, { postId :  postId });
			}
		});
};



var checkIfPublished = function(postId, callback) {
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
					return callback(null, false);
				}
			}
		});
	};

var publishPost = function(postId, callback) {
	if(!postId){
		return callback({status:400,code:"INITIAL_ARGUMENTS"});
	}
	
	async.waterfall([
		function(callback){
			var sql = "SELECT body FROM posts WHERE id = ?";
		pool.query(sql, [postId], function(err, result) {
			if (err) {
				console.log(err);
				return callback(err);
			}
			if(!result.length){
				return callback({code:"POST_NOT_FOUND"});
			}
			
			var text = striptags(result[0].body);
			var textLength = text.length;
			if(textLength < 360){
				return callback({status:400, code:"POST_TOO_SHORT", textLength: textLength, minLength: 360});
			}
			callback();
		});
		},
		function(callback){
			var sql = "UPDATE posts SET status = 1, publish_timestamp = CURRENT_TIMESTAMP WHERE id = ?";
		pool.query(sql, [postId], function(err, result) {
			if (err) {
				console.log(err);
				return callback(err);
			}
				return callback();
		});
		}
	],function(err){
		return callback(err);
	});
		
	};


var getRandom = function(userId, callback){
	
		var sql = ["SELECT post.id AS postId"]
		sql.push(",(SELECT COUNT(DISTINCT hashtag_posts.hashtag)");
		sql.push("FROM hashtag_posts AS hashtag_posts");
		sql.push("INNER JOIN");
		sql.push("( SELECT hashtag AS hashtag FROM hashtag_followers WHERE user_id = "+userId+" ) AS followed_hashtags");
		sql.push("ON hashtag_posts.hashtag = followed_hashtags.hashtag");
		sql.push("WHERE hashtag_posts.post_id = post.id ) AS rating_followness");
	
		sql.push(",1 + LOG10( ( post.upvotes_count + post.comment_count + 1 ) )");
		sql.push("*");
		sql.push(" (  ABS ( 7200 / ( TIMESTAMPDIFF( SECOND, post.created_at, NOW()  ) ) ) )");
		sql.push("AS rating_hotness");

		sql.push(",(SELECT COUNT( DISTINCT hp.hashtag)");
		sql.push("FROM hashtag_posts as hp");
		sql.push("INNER JOIN");
		sql.push("(SELECT hashtag as hashtag, count(hashtag) as count from hashtag_posts WHERE post_id IN (SELECT id FROM posts WHERE owner_user_id = "+userId+" AND ( status = 1 OR status = 2 ) ) group by hashtag  ORDER BY count DESC LIMIT 10 ) as uh");
		sql.push("ON hp.hashtag = uh.hashtag");
		sql.push("INNER JOIN posts as ps ON ps.id = hp.post_id");
		sql.push("WHERE hp.post_id = post.id and NOT ps.owner_user_id = "+userId+") AS rating_interestness");
		sql.push("FROM posts AS post");
	  sql.push("WHERE post.owner_user_id != " + userId );
	  sql.push("AND ( post.status = 1 OR post.status = 2 )");
		sql.push("ORDER BY rating_hotness * ( 1 + rating_interestness + rating_followness ) DESC LIMIT 25");
	
	  pool.query(sql.join(" "), function(err, result) {
			if (err) {
				console.log(err);
				return callback(err);
			}
			
			   
				
				return callback(null,result[Math.floor(Math.random() * ( result.length - 1)) + 0]);
		});
};

var commitAlias = function(postId,callback){
	var sql = "SELECT alias, title FROM posts WHERE id = ?";
	 pool.query(sql,[postId],function(err, result) {
		 if(err){
			 return callback(err);
		 }
		 
		 if(!result.length){
			 return callback({status:404});
		 }
		 if(result[0].alias){
			 return callback();
		 }
		  var alias = slug(result[0].title);
		  var updateSql = "UPDATE posts SET alias = ? WHERE id = ?"
		  pool.query(updateSql,[alias,postId],function(err, result) {
				if(err){
					return callback(err);
				}
				
				return callback();
				
			});
	 });	 
	
}


	var changeUpvotesCount = function(postId,value,callback) {
		if (!postId) {
			return callback({status:400});
		}
		var sql = "UPDATE posts SET upvotes_count = upvotes_count + (?) WHERE id = ?";

		pool.query(sql, [value,postId], function(err, result) {
			callback(err);
		});
		
	};



function getPost(postId, options, callback) {
	if (!postId && (!options.username || !options.alias)) {
		throw "postId inital";
	}

	var values = [];
	
	var sql = "SELECT";
	sql += " post.id AS id,";
	sql += " post.id AS post_id,";
	sql += " lower(post.alias) AS alias,";
	sql += " post.post_type_id as post_type_id,";
	sql += " post.title AS post_title,";
	sql += " post.description as post_description,";
	sql += " post.body as post_body,";
	sql += " post.upvotes_count as upvotes_count,";
	sql += " post.comment_count as comment_count,";
	sql += " post.status as post_status,";
	sql += " post.created_at as post_created_at,";
	sql += " post.publish_timestamp AS post_publish_timestamp,";
	sql += " post.image_url AS post_image_url,";
	sql += " post.image_icon_url AS post_image_icon_url,";
	sql += " post.image_bg_url AS post_image_bg_url,";
	sql += " post.image_md_url AS post_image_md_url,";
	sql += " post.image_lg_url AS post_image_lg_url,";
	sql += " post.image_source_url AS post_image_source_url,";
	sql += " post.views AS post_views,";
	sql += " post.short_link AS post_short_link,";
	sql += " post.read_time AS post_read_time,";
	sql += " CONCAT(CEIL(post.read_time / 60 ), ' min read' ) AS post_read_time_formatted,";
	sql += " author.user_id AS owner_user_id,";
	sql += " author.user_id as author_id,";
	sql += " author.name as author_name,";
	sql += " author.fullname as author_fullname,";
	sql += " author.title AS author_title,";
	sql += " author.description AS author_description,";
	sql += " author.profile_image_url AS author_profile_image_url,";
	sql += " author.points_count AS author_points_count,";
	sql += " network.network_id AS author_facebook_id,";
	sql += " author.website_url AS author_website_url";
	sql += " FROM posts AS post";
	sql += " INNER JOIN user_profile as author ON post.owner_user_id = author.user_id";
	sql += " LEFT OUTER JOIN user_networks as network ON network.user_id = author.user_id AND network.network = 'facebook' ";
	sql += " WHERE post.post_type_id > 1";
	if (postId) {
		sql += " AND post.id = ?";
		values.push(postId);
	} else {
		sql += " AND post.alias = ? AND author.name = ?";
		values.push(options.alias);
		values.push(options.username);
	}


	pool.query(sql, values, function(err, result) {
		if (err) {
			return callback(err);
		}
	
		if (!result.length) {
			return callback({status:404});
		}
		
		return callback(null,result[0])
	});
}

var deletePost = function(postId, userId, callback) {
		var sql = "UPDATE posts SET status = 9 WHERE id = ? AND owner_user_id = ?";
		pool.query(sql, [postId, userId], function(err, result) {
			callback(err);
		});
};

var checkIfUpvoted = function(postId, userId, callback) {
		var sql = "SELECT * FROM votes WHERE user_id = ? AND post_id = ?";
		var values = [userId, postId];
		pool.query(sql, values, function(err, result) {
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
	};

var createEmpty = function(postId, userId, callback) {
	
	};

var commitPost = function(post,callback){
	var sql = "INSERT INTO posts SET ?";
	pool.query(sql, post, function(err, result) {
			return callback(err,{postId:result?result.insertId:false});
	});	
};

module.exports = {
	createEmpty : createEmpty,
	getPost : getPost,
	commitPost : commitPost,
	changeUpvotesCount : changeUpvotesCount,
	commitAlias : commitAlias,
	getRandom : getRandom,
	publishPost : publishPost,
	checkIfUpvoted : checkIfUpvoted,
	checkIfPublished : checkIfPublished,
	checkIfPostOwner : checkIfPostOwner,
	updatePostBody : updatePostBody,
	updatePostTitle : updatePostTitle,
	createShortLinkToPost : createShortLinkToPost,
	analyzePost : analyzePost,
	getChildPics : getChildPics,
	getRelatedPostsBasedOnIntrest : getRelatedPostsBasedOnIntrest,
	getMoreFromUser : getMoreFromUser,
	getRelatedPosts : getRelatedPosts,
	getPostVisitingUsers : getPostVisitingUsers,
	deletePost : deletePost,
	trackPostView : trackPostView,
	addViewToPost : addViewToPost,
	addAndTrackPostView : addAndTrackPostView,
	getDrafts : getDrafts,
	unpublishPost : unpublishPost,
	getAllPosts : getAllPosts,
	activatePost : activatePost,
};
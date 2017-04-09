var async = require('async');
var pool = require('../../config/db.js').pool;
var slug = require('slug');
var moment = require('moment');

var fetchBlogsForProfile = function(profileIdentifier,params,callback){
	var sql;
	if(isNaN(profileIdentifier)){
		 sql = "SELECT * FROM blogs WHERE owner_user_id IN ( SELECT user_id FROM user_profile WHERE name = ?)";
	} else{
		 sql = "SELECT * FROM blogs WHERE owner_user_id = ?";
	}
	if(params.limit){
		sql += " LIMIT " + params.limit;
	}

	
				pool.query(sql, [profileIdentifier], function(err, result) {
					if(err){
						console.error(err);
						callback(err);
					} else {
						callback(null,result);
					}
	});
};

var updateBlog = function(blogIdentifier,blog, params,callback) {
	
	var row = {};

	row.title = blog.title;
	row.desc = blog.desc;

	
	var hashtags = [];
	try {
		hashtags = blog.hashtags.split(",");
	} catch (err) {
		console.error(err);
		hashtags = [];
	}


var blogId;
				async.waterfall([
					function(callback){
					var sql;
			if(isNaN(blogIdentifier)){
				var sql = "SELECT blog_id, owner_user_id FROM blogs WHERE slug = ?";
			} else {	
			 var sql = "SELECT blog_id, owner_user_id FROM blogs WHERE blog_id = ?";
				blogId = blogIdentifier;
			}
							

			pool.query(sql, [blogIdentifier], function(err, result) {
				if(err){
					return callback({status:500,data:err});
				}
					if(!result.length){
						return callback({status:404});
					}
					if(result[0].owner_user_id !== params.userId){
						return callback({status:401});
					}
						blogId = result[0].blog_id;
						return callback();
		
			});

					},
		function(callback) {
				var sql = "DELETE FROM hashtag_blogs WHERE blog_id = ?";
				pool.query(sql, [blogId], function(err, result) {
					if(err){
						console.error(err);
						callback(err);
					} else {
						return callback();
					}
				});
		},
		function(callback) {


			var sql = "UPDATE blogs SET title = ?, `desc` = ? WHERE blog_id = ?";
		
			pool.query(sql,[row.title,row.desc,blogId], function(err, result) {
				if(err){
					return callback(err);
				} else {
					return callback();
				}
			});



		},
		function(callback) {

			async.eachSeries(hashtags, function(hashtag, callback) {
				var blog_hashtag_row = {
					hashtag: hashtag,
					blog_id: blogId
				};
				var sql = "INSERT INTO hashtag_blogs SET ?";
				pool.query(sql, blog_hashtag_row, function(err, result) {
					if(err){
						console.error(err);
						callback(err);
					} else {
						callback();
					}
				});
			}, function(err) {
				callback(err);
			});
		}
	], function(err) {
		if(err){
			console.error(err);
			callback(err);
		}else{
			callback(null);
		}
	});
};



var deleteBlog = function(blogIdentifier,params,callback) {
		


var blogId;
				async.waterfall([
					function(callback){
					var sql;
			if(isNaN(blogIdentifier)){
				var sql = "SELECT blog_id, owner_user_id FROM blogs WHERE slug = ?";
			} else {	
			 var sql = "SELECT blog_id, owner_user_id FROM blogs WHERE blog_id = ?";
				blogId = blogIdentifier;
			}
							

			pool.query(sql, [blogIdentifier], function(err, result) {
				if(err){
					return callback({status:500,data:err});
				}
					if(!result.length){
						return callback({status:404});
					}
					if(result[0].owner_user_id !== params.userId){
						return callback({status:401});
					}
						blogId = result[0].blog_id;
						return callback();
		
			});

					},
		function(callback) {
				var sql = "DELETE FROM blogs WHERE blog_id = ?";
				pool.query(sql, [blogId], function(err, result) {
					if(err){
						console.error(err);
						callback(err);
					} else {
						return callback();
					}
				});
		},
		function(callback) {
				var sql = "DELETE FROM hashtag_blogs WHERE blog_id = ?";
				pool.query(sql, [blogId], function(err, result) {
					if(err){
						console.error(err);
						callback(err);
					} else {
						return callback();
					}
				});
		},


	], function(err) {
		if(err){
			console.error(err);
			callback(err);
		}else{
			callback(null);
		}
	});
};


var createBlog = function(blog, params, callback) {

	
	if(!blog.type||["journal","album","blog"].indexOf(blog.type)==-1){
		return callback("Wrong hashbook type");
	}
	
	var row = {};
	row.slug = slug(blog.slug);
	row.title = blog.title;
	row.desc = blog.desc;
	row.owner_user_id = params.user_id;
	row.type = blog.type;
	
	var hashtags = [];
	try {
		hashtags = blog.hashtags.split(",");
	} catch (err) {
		console.error(err);
		hashtags = [];
	}

	async.series([
		function(callback) {
			var sql = "INSERT INTO blogs SET ?";
			pool.query(sql, row, function(err, result) {
				if(err){
					callback(err);
				} else {
					console.log("Blog created with ID",result.insertId);
					row.blog_id = result.insertId;
					callback(err);
				}
			});
		},
		function(callback) {

			async.eachSeries(hashtags, function(hashtag, callback) {
				var blog_hashtag_row = {
					hashtag: hashtag,
					blog_id: row.blog_id
				};
				var sql = "INSERT INTO hashtag_blogs SET ?";
				pool.query(sql, blog_hashtag_row, function(err, result) {
					if(err){
						console.error(err);
					} else {
						callback();
					}
				});
			}, function(err) {
				callback(err);
			});
		}
	], function(err) {
		if(err){
			console.error(err);
			callback(err);
		}else{
			row.hashtags = hashtags;
			callback(null, row);
		}
	});

};


var fetchBlog = function(blogSlug, params, callback) {

	var blog = {};
	params.fields =  params.fields ? params.fields : ["hashtags","posts"];
	async.series([
				function(callback) {
			var sql = ["SELECT"];
			sql.push("blog.blog_id as blog_id, blog.slug AS blog_slug, blog.title as blog_title, blog.desc as blog_desc, blog.bg_picture as blog_bg_picture,");
			sql.push("profile.user_id AS author_id,");
			sql.push("profile.name AS author_username, profile.fullname AS author_fullname,");
			sql.push("profile.title AS author_title,");
			sql.push("profile.profile_image_url AS author_avatar");
			sql.push("FROM blogs AS blog");
			sql.push("INNER JOIN user_profile AS profile ON blog.owner_user_id = profile.user_id");
			sql.push("WHERE blog.slug = ?");
			pool.query(sql.join(" "), [blogSlug], function(err, result) {
				if (err) {
					console.log(err);
					return callback(err);
				}
				var header = result.length ? result[0] : {};
				blog.blog_id = header.blog_id;
				blog.blog_slug = header.blog_slug;
				blog.blog_title = header.blog_title;
				blog.blog_desc = header.blog_desc;
				blog.blog_bg_picture = header.blog_bg_picture;
				blog.author_username = header.author_username;
				blog.author_fullname = header.author_fullname;
				blog.author_avatar = header.author_avatar;
				blog.author_id = header.author_id;
				callback();
			});
		},
		
			function(callback) {
			var sql = ["SELECT"];
			sql.push("blog_id AS followers_count");
			sql.push("FROM blogs_followers");
			sql.push("WHERE blog_id = ? GROUP BY blog_id");
			pool.query(sql.join(" "), [blog.blog_id], function(err, result) {
				if (err) {
					console.log(err);
					return callback(err);
				}

			blog.stats = {
				followers_count : result.length ? result[0].followers_count : 0,
				views_count : 0,
				likes_count : 0
			};

				callback();
			});
		},
				
				function(callback) {
					if(!params.userId){
						blog.blog_already_following = false;
						return callback();
						
					}
			var sql = ["SELECT * "];
			sql.push("FROM blogs_followers");
			sql.push("WHERE blog_id = ? AND user_id = ?");
			pool.query(sql.join(" "), [blog.blog_id, params.userId], function(err, result) {
				if (err) {
					console.log(err);
					return callback(err);
				}
				blog.blog_already_following = result.length ? true : false;
				callback();
			});
		},
		
		function(callback) {
			var sql = ["SELECT DISTINCT"];
			sql.push("post.id as post_id, post.alias as alias, post.post_type_id as post_type_id,");
			sql.push("( CASE WHEN ( post.post_type_id  = 2 OR post.post_type_id  = 3 ) THEN CONCAT('http://vicigo.com/post/', profile.name,'/', post.alias) ELSE CONCAT('http://vicigo.com/post/', post.id) END ) AS link,");
			sql.push("post.parent_id as parent_id, post.owner_user_id as owner_user_id,");
			sql.push("post.title AS title, post.description as description,");
			sql.push("post.views AS views_count, post.comment_count AS comments_count, post.upvotes_count AS upvotes_count,");
			sql.push("post.created_at as timestamp, post.image_url as post_image_url,");
			sql.push("( CASE WHEN (CHAR_LENGTH(post.body) > 400) THEN CONCAT(SUBSTRING(post.body FROM 1 FOR 400),'..') ELSE post.body END )  AS post_body,");
			sql.push("CHAR_LENGTH(post.body) as post_body_length,");
			sql.push("CONCAT(CEIL(post.read_time / 60 ), ' min read' ) AS read_time");
			sql.push("FROM hashtag_posts AS hashtag_posts");
			sql.push("INNER JOIN posts AS post ON hashtag_posts.post_id = post.id");
			sql.push("INNER JOIN user_profile AS profile ON profile.user_id = post.owner_user_id");
			sql.push("WHERE hashtag_posts.hashtag IN ( SELECT hashtag FROM hashtag_blogs WHERE blog_id = ? )");
			sql.push("AND post.owner_user_id = ?");
			sql.push("ORDER BY post.created_at DESC LIMIT 20");

			pool.query(sql.join(" "), [blog.blog_id,blog.author_id], function(err, result) {
				if(err){
					console.log(err);
					return callback(err);
				}
				
				blog.posts = result;
				callback();
			});
		},
	function(callback){
				async.eachSeries(blog.posts, function(post, callback) {
					var index = blog.posts.indexOf(post);
					blog.posts[index].timestamp_formatted = moment(post.timestamp).fromNow();
					callback();
				},function(err){
					callback(err);
				});
	},
	function(callback) {
		if(params.fields.indexOf("hashtags")==-1){
			blog.hashtags = [];
			blog._hashtags = null;
			return callback();
		}
			var sql = ["SELECT"];
			sql.push("hashtag");
			sql.push("FROM hashtag_blogs");
			sql.push("WHERE blog_id = ?");
			sql.push("ORDER BY hashtag LIMIT 5");

			pool.query(sql.join(" "), [blog.blog_id], function(err, result) {
				if(err){
					console.log(err);
					return callback(err);
				}
				
				blog._hashtags = result;
				blog.hashtags = result.map(function(item){return item.hashtag; }).join(",");
				callback();
			});
		},
	], function(err) {

		callback(err, blog);
	});

};


			var changeField = function(blogIdentifier,change,params, callback){
				//{ fieldName : "blog_title", newValue : req.body.title}
				//{ userId : req.user.id }
				
				var blogId;
				async.waterfall([
					function(callback){
					var sql;
			if(isNaN(blogIdentifier)){
				var sql = "SELECT blog_id, owner_user_id FROM blogs WHERE slug = ?";
			} else {	
			 var sql = "SELECT blog_id, owner_user_id FROM blogs WHERE blog_id = ?";
				blogId = blogIdentifier;
			}
							

			pool.query(sql, [blogIdentifier], function(err, result) {
				if(err){
					return callback({status:500,data:err});
				}
				
					if(!result.length){
						return callback({status:404});
					}
					if(result[0].owner_user_id !== params.userId){
						return callback({status:401});
					}
						blogId = result[0].blog_id;
						return callback();
		
			});
		

		
					},
					function(callback){
				var sql = "UPDATE blogs SET ?? = ? WHERE blog_id = ?"
				pool.query(sql,[change.fieldName,change.newValue,blogId] , function(err, result) {
				if(err){
					return callback({status:500,data:err});
				} else {
					return callback();
				}
			});
					}
				],function(err){
					return callback(err);
				});

			};

var getHashbooks = function(params,callback){

	var sql;

		 sql = "SELECT * FROM blogs ORDER BY timestamp DESC LIMIT 100";

				pool.query(sql, [], function(err, result) {
					if(err){
						console.error(err);
						callback(err);
					} else {
						callback(null,result);
					}
	});

};


var followBlog = function(hashbookId,params,callback){
	var sql;
	
	var follow_rel = {
		blog_id : hashbookId,
		user_id : params.userId,
		email: params.email,
		medium : params.userId ? "vicigo" : params.medium,
		source : params.source
	}
	

		sql = "INSERT INTO blogs_followers SET ?";

				pool.query(sql,follow_rel,function(err, result) {
				if(err){
					return callback({status:500,data:err});
				} else {
					return callback();
				}
				});
};

function setBackgroundPicture(hashbookId,userId,imageUrl,callback){
					var sql = "UPDATE blogs SET bg_picture = ? WHERE blog_id = ? AND owner_user_id = ?";
					pool.query(sql,[imageUrl,hashbookId,userId], function(err, result) {
						return callback(err)
					});
}



module.exports = {
	followBlog : followBlog,
	deleteBlog : deleteBlog,
	updateBlog : updateBlog,
	changeField : changeField,
	createBlog: createBlog,
	fetchBlog: fetchBlog,
	getHashbooks: getHashbooks,
	fetchBlogsForProfile : fetchBlogsForProfile,
	setBackgroundPicture : setBackgroundPicture,
};
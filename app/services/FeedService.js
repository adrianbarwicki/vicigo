var async = require('async');
var services = require("../services/services.js");
var rankingController = require("../controllers/ranking.js");
var HashtagService = require("./HashtagService.js");
var PostService = require("./PostService.js");
var pool = require('../../config/db.js').pool;
var striptags = require('striptags');
var moment = require('moment');

var filterTypes = ["pics","posts","upvotes"];

var getFeed = function(options, callback) {

		if(options.algorithm == "feed"){
		 if(!options.userId){
			 return callback({message:"Feed only available for registered users.", status: 401 });
		 }
		}
	
		
  if( options.algorithm == "discover" ){
		if(!options.userId){
			return callback({message:"Discover algorithm only available for registered users.", status: 401});
		}
	}
	
	var feeds = [];
	var values = [];

	options.profileIds = options.profileIds ? options.profileIds : [];
	options.limit = (options.limit) ? options.limit : 10;
	options.algorithmTypes = ["feed","discover","none"];
	options.sort = (options.sort) ? options.sort : "new";
	options.filter = (options.filter) ? options.filter : "none";

	
	var sql = ["SELECT"];
	sql.push("post.id as id,post.post_type_id as post_type_id, post.parent_id as parent_id,");
	sql.push("post.alias AS post_alias,");
	sql.push("( CASE WHEN ( post.post_type_id = 2 OR post.post_type_id  = 3 ) THEN CONCAT('http://vicigo.com/post/', profile.name,'/', post.alias) ELSE CONCAT('http://vicigo.com/post/', post.id) END ) AS link,");
	sql.push("post.owner_user_id as owner_user_id, post.description as description,");
	sql.push("( CASE post.post_type_id WHEN 5 THEN parent_post.title ELSE post.title END ) AS title,");
	sql.push("post.comment_count AS comment_count,");
	sql.push("post.upvotes_count AS upvotes_count,");
	sql.push("post.views AS views_count,");
	sql.push("post.created_at as created_at, post.image_url AS image_url,");
  sql.push("SUBSTRING(post.body FROM 1 FOR 400) AS body,");
	sql.push("CHAR_LENGTH(post.body) AS bodyLength,");
  sql.push("profile.user_id AS authorId,");
	sql.push("profile.name AS authorName,");
	sql.push("profile.fullname AS authorFullName,");
	sql.push("profile.title AS authorTitle,");
	sql.push("profile.profile_image_url AS authorImage,");
	sql.push("profile.website_url AS authorWebsiteUrl");

	if(options.algorithm == "feed"){
		
		 if(!options.userId){
			 return callback({code:"Feed only available for registered users."});
		 }
		
		sql.push(",( SELECT CASE");
    sql.push("WHEN ( EXISTS (SELECT 1 FROM user_followers AS following WHERE following.user_id = ? AND following.follower_id = post.owner_user_id) OR post.owner_user_id = ? ) ");
		values.push(options.userId);
		values.push(options.userId);
    sql.push("THEN 1");
    sql.push("ELSE 0");
    sql.push("END");
		sql.push(") AS followed");
		
	}
	
	options.searchness = false;
	if(options.searchness&&options.userId){
		sql.push(", (SELECT COUNT( DISTINCT hp.hashtag)");
		sql.push("FROM hashtag_posts as hp");
	
		sql.push("INNER JOIN");
		//SELECT hashtag as hashtag, count(hashtag) as count FROM search_history WHERE date >= CURDATE() - INTERVAL 1 DAY AND user_id = ? GROUP BY hashtag ORDER BY count DESC LIMIT 10
		sql.push("( SELECT keyword as hashtag, count(keyword) as count FROM vicigo.search_history WHERE date > NOW() - INTERVAL 2 DAY AND user_id = ? group by keyword  ORDER BY date DESC LIMIT 20 ) as uh");
		values.push(options.userId);	
		sql.push("ON hp.hashtag = uh.hashtag");
		sql.push("INNER JOIN posts as ps ON ps.id = hp.post_id");
		sql.push("WHERE hp.post_id = post.id and not ps.owner_user_id = ?) AS rating_searchness");
		values.push(options.userId);	
	}
	options.followness = false;
	if(options.followness&&options.userId){
		sql.push(", (SELECT COUNT(DISTINCT hashtag_posts.hashtag)");
		sql.push("FROM hashtag_posts AS hashtag_posts");
		sql.push("INNER JOIN");
		sql.push("( SELECT hashtag AS hashtag FROM hashtag_followers WHERE user_id = ? ) AS followed_hashtags");
		values.push(options.userId);	
		sql.push("ON hashtag_posts.hashtag = followed_hashtags.hashtag");
		sql.push("WHERE hashtag_posts.post_id = post.id ) AS rating_followness");
	}
	

	
  if( options.algorithm == "discover" ){
		
		if(!options.userId){
			return callback({code:"Discover algorithm only available for registered users."});
		}
		
			// * hotness * //"
		sql.push(",LOG10( ( post.upvotes_count + post.comment_count + 1 ) )");
		sql.push("+");
		sql.push(" (  ABS ( 30000 / ( TIMESTAMPDIFF( SECOND, post.created_at, NOW()  ) ) ) )");
		//sql.push("+");
		sql.push("AS rating_hotness");
		if(options.userId){
			// * intrestness * //
		sql.push(", (SELECT COUNT( DISTINCT hp.hashtag)");
		sql.push("FROM hashtag_posts as hp");
		sql.push("INNER JOIN");
		sql.push("(SELECT hashtag as hashtag, count(hashtag) as count from hashtag_posts WHERE post_id IN (SELECT id FROM posts WHERE owner_user_id = ? AND ( status = 1 OR status = 2 ) ) group by hashtag  ORDER BY count DESC LIMIT 10 ) as uh");
		values.push(options.userId);	
		sql.push("ON hp.hashtag = uh.hashtag");
		sql.push("INNER JOIN posts as ps ON ps.id = hp.post_id");
		sql.push("WHERE hp.post_id = post.id and NOT ps.owner_user_id = ?) AS rating_interestness");
		values.push(options.userId);
					}
	}

	sql.push("FROM posts as post");
	sql.push("INNER JOIN user_profile as profile ON post.owner_user_id = profile.user_id");
	sql.push("LEFT JOIN posts AS parent_post ON parent_post.id = post.parent_id ");
	sql.push("WHERE post.status > 0 AND post.status < 3");
	
	if( options.profileId && options.filter!=="upvotes" ){
    sql.push("AND post.owner_user_id = ?");
    values.push(options.profileId);
  }
	
	if(options.profileIds.length ){
		sql.push("AND (");
		for( var index = 0; index < options.profileIds.length; index++ ){
		if(index>0){
			sql.push("OR");
		}
		sql.push("post.owner_user_id = ?");
    values.push(options.profileIds[index]);
		}
    sql.push(")");
  }
	
  if(options.hashtag){
    sql.push("AND post.id IN");
    sql.push("( SELECT post_id FROM hashtag_posts WHERE UPPER(hashtag) = UPPER( ? ) )");
    values.push(options.hashtag);
  }

	switch  ( options.filter ){
    case "pics":
      sql.push("AND ( post.post_type_id = 4 OR post.post_type_id = 5 ) ");
      break;
    case "posts":
      sql.push("AND ( post.post_type_id = 2 OR post.post_type_id = 3 )");
      break;
		case "upvotes" && options.profileId:
      sql.push("AND ( post.id IN  ( SELECT DISTINCT post_id FROM votes WHERE user_id = ?) )");
			values.push(options.profileId);
      break;
		default: 
			sql.push("AND ( post.post_type_id > 1  AND post.post_type_id < 6)");
	}

	if(	options.algorithm == "feed"){
		sql.push("HAVING followed = 1");
	}
	
			sql.push("ORDER BY");
	if(options.algorithm == "feed"){
		sql.push("post.created_at DESC");
	} else if(options.algoritm == "discover"){
		sql.push("( rating_followness + rating_searchness + followed * 2 + rating_interestness ) * rating_hotness DESC");
	} else {
		sql.push("post.created_at DESC");
	}
	

		if( options.page ){
			if(options.page == 1){
				sql.push("LIMIT " + options.limit);	
			} else {
				sql.push("LIMIT ?, " + options.limit);
				values.push((options.page-1)*options.limit);
			}
			//values.push(options.limit);
		} else {
			sql.push("LIMIT " + options.limit);
		}
		
	
	sql = sql.join(" ");
	pool.query(sql,values, function(err, result) {
		if (err) {
		console.error(err);
		return callback(err);
		}
		
		feeds = result;

		async.eachLimit(feeds,2,function(post, callback) {
			var index = feeds.indexOf(post);
				if (post.bodyLength > 400) {
					feeds[index].body = striptags(feeds[index].body) + "...";
					feeds[index].isFull = false;
				} else {
					feeds[index].isFull = true;
				}
			feeds[index].created_at = moment(post.created_at).fromNow();
			feeds[index].upvotes = [];
			
			async.parallel([
				
			function(callback){
				
				HashtagService.getHashtagsForPost(post.id, function(err, hashtags) {
							if (err) {
								console.log(err);
								callback(err);
							} else {
									feeds[index].hashtags = hashtags;
									callback();
							}
						});
			},	
				
				
			function(callback){
				
			if (options.userId){
			services.checkIfAlreadyUpvoted(post.id,options.userId,function(err, alreadyUpvoted){
					if (err) {
						callback(err);
					} else {
						feeds[index].alreadyUpvoted = alreadyUpvoted;
						callback();
					}
				});	
			} else {
			feeds[index].alreadyUpvoted = false;	
			callback();
			}
			},
				function(callback){
					
			if (post.post_type_id == 2 || post.post_type_id == 3 || post.post_type_id == 4 ) {
				rankingController.getUpvotes(post.id,{limit:5}, function(err, upvotes){
					if (err) {
						console.log(err);
						callback(err);
					} else {
						if (upvotes.length) {
						feeds[index].upvotes = upvotes;
					} else {
						feeds[index].upvotes = [];
					}
					callback();
					}
				});
			} else {
				callback();
			}	
				},
			], function(err){
				callback(err);
			});

		}, function(err) {
			callback(err, feeds);
		});
	});
};



module.exports={
  getFeed : getFeed,
};
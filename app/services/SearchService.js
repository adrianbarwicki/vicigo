var async = require('async');
var pool = require("../../config/db.js").pool;




var saveSearchKeyword = function(searchString,user_id,callback){

	
  var sql = "INSERT INTO search_history SET user_id = ?, keyword = ?";
  pool.query(sql, [user_id,searchString], function(err, result) {
		if (err){
			console.error(err);
		}
	if(callback){
		callback(err);
	}
      });
};	

var searchWithString = function(searchString,params,callback){


  
  searchString = searchString.toLowerCase();
	searchString = searchString.replace('#','');
	searchString = searchString.replace('@','');
	
	saveSearchKeyword(searchString,params.userId);
	
	searchString = searchString.replace('justinbieber','notcool');
  searchString = searchString.replace('shit','notcool');
	searchString = searchString.replace('ceo','viciceo');
  
 searchString = searchString ? searchString : 'vicigo';
 searchString = ( searchString  instanceof Array ) ? 'vicigo' : searchString;
  
  var sql = "";
  sql += " SELECT 'profile' AS type, user.user_id AS objId, CONCAT('@', user.name) AS header FROM user_profile as user";
  sql += " WHERE UPPER(user.name) LIKE UPPER('%" + searchString + "%')";
  sql += " UNION ";
  sql += " SELECT 'post' AS type, post.id AS objId, post.title AS header FROM posts as post";
  sql += " WHERE"
  sql += "( UPPER(post.body) LIKE UPPER('%" + searchString + "%')";
  sql += " OR UPPER(post.title) LIKE UPPER('%" + searchString + "%') )";
  sql += " AND ( post.status > 0  AND  post.status < 4 ) AND ( post.post_type_id = 2 OR post.post_type_id = 3 ) ";
  sql += " UNION ";
  sql += " SELECT 'hashtag' AS type, hashtag.hashtag as objId, CONCAT('#', hashtag.hashtag) AS header  FROM hashtags AS hashtag";
  sql += " WHERE UPPER(hashtag.hashtag) LIKE UPPER('%" + searchString + "%')";
	sql +=	"ORDER BY ( CASE type"
	sql +=  " WHEN 'profile' THEN 1"
  sql +=  " WHEN 'hashtag' THEN 2"
  sql +=  " WHEN 'post' THEN 3"
  sql +=  " ELSE 100 END ) ASC"
  sql += " LIMIT 0,8";

  console.log(sql);
			pool.query(sql, [], function(err, result) {
		if (err){
			callback(err);
			console.error(err);
		} else {
				callback(null,result);
	  }
      });
			
		
  
};




module.exports={
  searchWithString : searchWithString
};
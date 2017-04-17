var async = require('async');
var pool = require("../../config/db.js").pool;


var purifyUsername = function(username){
	
	if(!username){
		return { err : "empty"} ;
	}
	console.log(username);
	username = username.toLowerCase();
	username = username.replace(/[^\w\s]/gi, '');
	username = username.replace(/\s+/g, '');
	
	if(username=="justinbieber"){
		return { err : "dude... not cool", username : ""};
	}
	
	if(username=="shit"){
		return { err : "we do not like shit", username : ""};
	}
	
	if(username=="penis"){
		return { err : "seriously?", username : ""};
	}
	
	return { username : username };
};


var addPointsToProfile = function(user_id, points_count, callback) {
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
};

var changeUsername = function(user_id, username, callback) {

	if(!username || !user_id ){
		callback("bad request");
		return;
	}
	
	if(username.length < 4 ){
		callback("too short");
		return;
	}
	
	var resp = purifyUsername(username);

	if(resp.err){
		callback(resp.err);
		return;
	} else{
		username = resp.username;
	}
	
	async.waterfall([
		function(callback){
			var sql = "SELECT * FROM user_profile WHERE name = ? AND NOT user_id = ?";
			pool.query(sql, [username,user_id], function(err, result) {
		if (err){
			callback(err);
			console.error(err);
		} else {
			if(result.length){
				callback("username taken");
			} else {
				callback();
			}
			
		}
	});
		},
		function(callback){
			var sql = "UPDATE user_profile SET name = ? WHERE user_id = ?";
			pool.query(sql, [username,user_id], function(err, result) {
		if (err){
			callback(err);
			console.error(err);
		} else {
			if(result.length){
				callback("username taken");
			} else {
				callback();
			}
			
		}
	});
		},
	],function(err){
		callback(err);
	});
	
};


var getFreeUsername = function(usernameTemplate, callback) {
	if (!usernameTemplate) {
		return callback("bad request");
	}
	
	if (usernameTemplate.length < 4 ) {
		return callback("too short");
	}
	
	var resp = purifyUsername(usernameTemplate);

	var username;

	if (resp.err) {
		username = "notcool";
	} else {
		username = resp.username;
	}
	
	
	var lookForUsername = true;
	var count = 1;	

	async.whilst(
		() => lookForUsername,
		callback => {
			console.log("Checking if username is free: ", username);

			var sql = "SELECT * FROM user_profile WHERE name = ?";

			pool.query(sql, [username], (err, result) => {
				if (err) {
					console.error(err);

					return callback(err);
				}

				if (result.length) {
					return callback({ code: 'USERNAME_TAKEN' });
				}

				if (result.length) {
					count + 1;
					username = username + String(count);

					return callback();
				}

				lookForUsername = false;

				callback();
			});
		}, err => {
			callback(err,username);
		});
};
	

var checkIfExists = function(userId,callback){
	var sql = "SELECT * FROM user_profile WHERE user_id = ?";
			pool.query(sql, [userId], function(err, result) {
		if (err){
			callback(err);
			console.error(err);
		} else {
			if(result.length){
				callback(null,result[0]);
			}else{
				callback(null,false);
			}
		}
	});
}

var changeWebsite = function(user_id, website, callback) {

	if( !user_id ){
		callback("bad request");
		return;
	}
	callback();
	return;

			var sql = "UPDATE user_profile SET title = ? WHERE user_id = ?";
			pool.query(sql, [title,user_id], function(err, result) {
		if (err){
			callback(err);
			console.error(err);
		} else {
			if(result.length){
				callback("username taken");
			} else {
				callback();
			}
			
		}
	});

	
};


var changeTitle = function(user_id, title, callback) {

	if(!title || !user_id ){
		callback("bad request");
		return;
	}
	
	if(title.length < 4 ){
		callback("too short");
		return;
	}

			var sql = "UPDATE user_profile SET title = ? WHERE user_id = ?";
			pool.query(sql, [title,user_id], function(err, result) {
		if (err){
			callback(err);
			console.error(err);
		} else {
			if(result.length){
				callback("username taken");
			} else {
				callback();
			}
			
		}
	});

	
};


var setProfileImage = function(user_id, image_url, callback) {

	var sql = "UPDATE user_profile SET profile_image_url = ? WHERE user_id = ?";
	pool.query(sql, [image_url, user_id], function(err, result) {
		if (err) {
			return callback(err);
		} else {
			return callback();
		}
	});
};



var getRecommendedProfiles = function(profileId, params, callback) {
	params.limit = (params.limit) ? params.limit : 8;
	var values = [];
	var sql = "";
	sql += "( SELECT  profile.user_id AS profile_id, profile.name AS username, ";
	sql += " profile.title AS title, profile.profile_image_url AS avatar,";
	sql += " profile.feeds_count AS feeds_count, 0 AS promoted";
	sql += " FROM user_profile AS profile";
	sql += " WHERE";
	sql += " profile.user_id NOT IN ( SELECT follower_id FROM user_followers WHERE user_id = ? )";
	values.push(profileId);
	sql += " AND profile.user_id != ?";
	values.push(profileId);
	sql += " ORDER BY feeds_count DESC LIMIT 10 )";
	sql += " UNION DISTINCT ";
	sql += " ( SELECT user.user_id AS profile_id,profile.name AS username, profile.title AS title,";
	sql += " profile.profile_image_url AS avatar, profile.feeds_count AS feeds_count,";
	sql += " 1 AS promoted FROM user_promotion AS user";
	sql += " INNER JOIN user_profile AS profile ON user.user_id = profile.user_id ";
	sql += " WHERE user.user_id NOT IN ( SELECT follower_id FROM user_followers WHERE user_id = ? )";
	values.push(profileId);
	sql += " AND user.user_id != ? LIMIT 2 ) ";
	values.push(profileId);
	sql += " ORDER BY promoted DESC, feeds_count DESC LIMIT ?";
	values.push(params.limit);
	console.log(sql);
	console.log(values)
	pool.query(sql, values, function(err, result) {
		return callback(err, result,sql);
	});
};

var getProfileNetworks = function(profileId,callback){
var sql = "SELECT network_id, network FROM user_networks WHERE user_id = ? AND network = 'facebook'";
	pool.query(sql, [profileId], function(err, result) {
		if (err) {
			callback(err);
		} else {
			result = result.map(function(item){
				item.url = "https://www."+item.network+".com/"+item.network_id;
				return item;
			});
			callback(null,result);
		}
	});
};

var setProfileGender = function(userId,gender,callback){
							pool.query("UPDATE user_profile SET gender = ? WHERE user_id = ?",[gender,userId], function(err, result) {
								return err ? console.error(err) : true;
							});
};

var getProfile = function(userId,callback){
		var sql = "SELECT * FROM user_profile WHERE user_id = ?";
		pool.query(sql,[userId], function(err, result) {
			if(err){
				return callback(err);
			}
			if(!result.length){
				return callback({code:"PROFILE_NOT_FOUND",status:400});
			}
			
				return callback(null,result[0])
		});
}

module.exports = {
	getProfile : getProfile,
	checkIfExists : checkIfExists,
	getProfileNetworks : getProfileNetworks,
	getRecommendedProfiles : getRecommendedProfiles,
	setProfileGender: setProfileGender,
	setProfileImage : setProfileImage,
	changeWebsite : changeWebsite,
	changeTitle : changeTitle,
	getFreeUsername : getFreeUsername,
	purifyUsername : purifyUsername,
	changeUsername : changeUsername,
  addPointsToProfile : addPointsToProfile
};


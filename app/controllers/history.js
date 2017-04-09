
var moment = require("moment");
var async = require('async');
var pool = require("../../config/db.js").pool;

var postController = require("./post.js");
var sender = require("../email/sender.js");
var services = require("../services/services.js");
var ProfileService = require("../services/profileService.js");

var events = {
	upvote : {
		id : 1,
		points: 1
	},
	upvoted : {
		id : 2,
		points : 10
	},
	question : {
		id: 3,
		points : 10 
	},
	answer : {
		id: 4,
		points : 50 
	},
	blog : {
		id: 5,
		points : 100 
	},
	followed : {
		id: 6,
		points : 10 
	},
	following : {
		id: 7,
		points : 2 
	},
	unfollowed : {
		id: 8,
		points : -10 
	},
	unfollowing : {
		id: 9,
		points : -2 
	},	
	comment : {
		id: 10,
		points : 2 
	},	
	commented : {
		id: 11,
		points : 10 
	},
	answer_given : {
		id: 12,
		points : 20 
	},
	downvote : {
		id: 13,
		points : -1 
	},
	downvoted : {
		id: 14,
		points : -10 
	},
	image : {
		id: 15,
		points : 5 
	},
	viewTreshold : {
		id: 16,
		points : 5
	},
};


function createEvent(eventId,params){
	var event = {};
	event.status = 0;
	
	event.event_type_id = eventId;
	event.points_amount = 0;
	event.user_id = ( params.toUserId ) ? params.toUserId  : null ;
	event.rel_to_user_id = params.fromUserId;
	event.rel_to_post_id = params.postId;
	event.details = params.details;
	event.created_at = new Date();
	console.log(event);
	return event;
}


function addEvent(event, callback){
	pool.query("INSERT  history SET ?", event, function(err, result){
		return callback(err);
	});
}



module.exports.viewTresholdEmail = function(postId, callback) {
			var post = {};
			var user;
			var views;

			async.waterfall([

				function(callback){
					var sql = "SELECT * FROM posts WHERE id = ?";
					pool.query(sql, [postId], function(err, result){
						if (err){
							callback(err);
						} else {
							if (result.length){
								post = result[0];
								views = post.views;
								callback();
							} else {
								callback({ msg : "Upvote email not sent. The post has not been found!"});
							}
						}
					});
				},

				function(callback){
					var sql = "SELECT user.email as email FROM user_profile AS profile INNER JOIN user as user ON user.id = profile.user_id WHERE id = ?";
					pool.query(sql, [post.owner_user_id], function(err, result){
						if (err){
							callback(err);
						} else {
							if(result.length){
								user = result[0];
								callback();
							} else {
								callback({ msg  : "Upvoting user was not found. No email sent for the upvote!" });
							}
						}
					});
				},

			], function(err){
				if (err){
					console.log(err);
					return callback(err);
				} 

				
				if( (  views == 100 || views == 500 || views == 1000 || views == 5000 || views == 10000 || views == 25000 || views == 50000 || views == 100000 ) ) {
				 addEvent(createEvent(events.viewTreshold.id,{ toUserId : post.owner_user_id, postId : post.id, details : views }), function(err){
					return err ? console.error(err) : true;
				});
				}

				if( !( views == 500 || views == 1000 || views == 5000 || views == 10000 || views == 25000 || views == 50000 || views == 100000 ) ){
						return false;	
				}
			
				services.checkIfEmailsWanted(post.owner_user_id, function(err, wanted){
						if (err){
							return callback(err);
						}
						if (wanted){
						sender.viewTresholdEmail(user,post,views,function(err){
							return err ? console.error(err) : true;
						});
						} 
					});
			});	
};	




module.exports.CommentEvent = function(userId, postId, commentId, callback) {

	
	var eventDetails1 = events.comment;
	var eventDetails2 = events.commented;
	//  event commenting
	var event1 = {};
	event1.event_type_id = eventDetails1.id;
	event1.points_amount = eventDetails1.points;
	event1.user_id = userId;
	event1.rel_to_post_id = postId;
	event1.created_at = new Date();
	event1.status = 0;
	
	// event commented
	var event2 = {}; // missing user ID
	event2.event_type_id = eventDetails2.id;
	event2.points_amount = eventDetails2.points;
	event2.rel_to_user_id = userId;
	event2.rel_to_post_id = postId;
	event2.created_at = new Date();
	event2.status = 0;
	
	commentEmail(commentId, postId,function(err){
		if (err){
			console.error(err);
		}
	});
	
	async.waterfall([
		
	function(callback)	{
	
	pool.query("SELECT owner_user_id as user_id FROM posts WHERE id = ?", [postId], function(err, result){
		if(err){
			console.error(err);
			callback({err:err, status:500});
		} else {
			if(result.length){
				event2.user_id = result[0].user_id;
			}
			callback();
		}
	});		
	},
		
	function(callback){
		async.parallel([
		function(callback){
			addEvent(event1, function(err){
				return callback(err);
			});
		},
		function(callback){
			addEvent(event2, function(err){
				return callback(err);
			});
		},
			
		function(callback){
			pool.query("UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?",[event1.rel_to_post_id], function(err, result){
				return callback(err);
			});
		},
	], function(err){
		callback(err);
	});
		
	}
	], function(err){
		if(err){
			console.log(err);
			return callback(err);
		} else {
			return callback();
		}
	});
	
};







module.exports.FollowEvent = function(userId, followedId) {

	
	var eventDetails_following = events.following;
	var eventDetails_followed = events.followed;
	
	var event1 = {};
	event1.event_type_id = eventDetails_following.id;
	event1.points_amount = eventDetails_following.points;
	event1.user_id = userId;
	event1.rel_to_user_id = followedId;
	event1.status = 0;

	var event2 = {};
	event2.event_type_id = eventDetails_followed.id;
	event2.points_amount = eventDetails_followed.points;
	event2.user_id = followedId;
	event2.rel_to_user_id = userId;
	event2.status = 0;
	
	async.parallel([
		function(callback){
			addEvent(event1, function(err){
				return callback(err);
			});
		},
		function(callback){
			addEvent(event2, function(err){
				return callback(err);
			});
		},
	], function(err){
		if(err){
			console.error("[ERROR] [HistoryController]",err);
		}
	});
	
};

module.exports.UnfollowEvent = function(userId, unfollowedId, callback) {
	
	var eventDetails_unfollowed = events.unfollowed;
	var eventDetails_unfollowing = events.unfollowing;
	
	
	var event1 = {};
	event1.user_id = unfollowedId;
	event1.rel_to_user_id = userId;
	event1.event_type_id = eventDetails_unfollowed.id;
	event1.points_amount = eventDetails_unfollowed.points;
	event1.created_at = new Date();
	event1.status = 0;

	var event2 = {};
	event2.user_id = userId;
	event2.rel_to_user_id = unfollowedId;
	event2.event_type_id = eventDetails_unfollowing.id;
	event2.points_amount = eventDetails_unfollowing.points;
	event2.created_at = new Date();
	event2.status = 0;
	
	
	
	
	
	async.parallel([
		/*
		function(callback){
		ProfileService.addPointsToProfile(event1.user_id, event1.points_amount, function(err){
				return callback(err);
			});
		},
		
		function(callback){
		ProfileService.addPointsToProfile(event2.user_id, event2.points_amount, function(err){
				return callback(err);
			});
		},
		*/
		function(callback){
			addEvent(event1, function(err){
				return callback(err);
			});
		},
		function(callback){
			addEvent(event2, function(err){
				return callback(err);
			});
		},
	], function(err){
		return callback(err);
	});
};




module.exports.DownvoteEvent = function(userId, postId, callback) {
	
	
	
	var eventDetails = events.downvote;


	var event = {};
	event.user_id = userId;
	event.rel_to_post_id = postId;
	event.event_type_id = eventDetails.id;
	event.points_amount = eventDetails.points;
	event.created_at = new Date();
	event.status = 0;
	
	async.parallel([
		function(callback){
			postController.downvote(postId, function(err){
				return callback(err);
			});
		},
		/*
		function(callback){
		ProfileService.addPointsToProfile(event.user_id, event.points_amount, function(err){
				if (err) throw err;
				callback();
			});
		}, 
		*/
		function(callback){
			addEvent(event, function(err){
				return callback(err);
			});
		},
	], function(err){
		return callback(err);
	});	
};



module.exports.DownvotedEvent = function(downvotingUserId, postId, callback) {
	
	var eventDetails = events.downvoted;

	var event = {};
	event.rel_to_user_id = downvotingUserId;
	event.rel_to_post_id = postId;
	event.event_type_id = eventDetails.id;
	event.points_amount = eventDetails.points;
	event.created_at = new Date();
	event.status = 0;
	
	
	var sql1 = "SELECT owner_user_id AS owner_user_id FROM posts WHERE id = ?";
	var values1 = [event.rel_to_post_id];
	pool.query(sql1, values1, function(err, result){
		if(err) throw err;
		
	if ( result.length ){
		
	event.user_id = result[0].owner_user_id;	

	
	async.parallel([		
		function(callback){
		ProfileService.addPointsToProfile(event.user_id, event.points_amount, function(err){
				return callback(err);
			});
		},
		function(callback){
			addEvent(event, function(err){
				return callback(err);
			});
		},	
	], function(err){
		callback(err);
	});	
		}	else {
			// there need to be error
			console.log("[HISTORY CONTROLLER] User not found so no points added !");
			callback();
		}

	});

	
};





module.exports.UpvoteEvent = function(userId, postId, callback) {
	
	var eventDetails = events.upvote;

	var event = {};
	event.user_id = userId;
	event.rel_to_post_id = postId;
	event.event_type_id = eventDetails.id;
	event.points_amount = eventDetails.points;
	event.created_at = new Date();
	event.status = 0;
	
	async.parallel([
		function(callback){
			postController.upvote(postId, function(err){
				return callback(err);
			});
		},
		/*
		function(callback){
		ProfileService.addPointsToProfile(event.user_id, event.points_amount, function(err){
				return callback(err);
			});
		},
		*/
		function(callback){
			addEvent(event, function(err){
				return callback(err);
			});
		},
	], function(err){
		if (err) { console.log(err); }
		callback(err);
	});	
};	


module.exports.UpvotedEvent = function(upvotingUserId, postId, callback) {

	var eventDetails = events.upvoted;
	var event = {};
	
	event.rel_to_user_id = upvotingUserId;
	event.rel_to_post_id = postId;
	event.event_type_id = eventDetails.id;
	event.points_amount = eventDetails.points;
	event.created_at = new Date();
	event.status = 0;
	
	
	var sql1 = "SELECT owner_user_id AS owner_user_id FROM posts WHERE id = ?";
	var values1 = [event.rel_to_post_id];
	pool.query(sql1, values1, function(err, result){
		if(err){
			 return callback(err);
		}
		
	if ( result.length ){
		
	event.user_id = result[0].owner_user_id;	

	upvoteEmail(upvotingUserId,event.rel_to_post_id,function(err){
		if (err){
			console.error(err);
		} else {
			console.log("[HISTORY CONTROLLER] Upvote email has been sent.");
		}
	});
	
	async.parallel([
		function(callback){
		ProfileService.addPointsToProfile(event.user_id, event.points_amount, function(err){
				if (err) throw err;
				callback();
			});
		},
		function(callback){
			addEvent(event, function(err){
				if(err) throw err;
				callback();
			});
		},	
	], function(err){
		callback();
	});	
		}	else {
			// there need to be error
			console.log("[HISTORY CONTROLLER] User not found so no points added !");
			callback();
		}

	});

	
};


module.exports.getEventsForUser = function(user_id, options, callback) {

	options.limit = (options.limit) ? options.limit : 20;
	options.page = (options.page) ? options.page : 1;
	var values = [user_id];

	
	var sql = "SELECT";
	sql += " history.event_type_id as event_type,";
	sql += " related_user.name as related_user_name,";
	sql += " related_user.user_id as related_user_id,";
	sql += " post.id as post_id,";
	sql += " post.title as post_title,";
	sql += " post.post_type_id as post_type,";
	sql += " history.points_amount as points,";
	sql += " history.created_at as created_at";
	sql += " FROM history AS history";
	sql += " LEFT JOIN posts AS post ON post.id = history.rel_to_post_id";
	sql += " LEFT JOIN user_profile AS related_user ON related_user.user_id =  history.rel_to_user_id";
	sql += " WHERE history.user_id = ? ORDER BY history.created_at DESC";
	if(options.page == 1){
				sql += " LIMIT ?";
				values.push(options.limit);
		} else {
				sql += " LIMIT ?, ?";
				values.push((options.page-1)*options.limit);
				values.push(options.limit);
		}
	
	pool.query(sql, values, function(err, result){
		if (err){
			return callback(err);
		}	
			result.map(function(item){
					item.created_at = moment(item.created_at).fromNow();
					return item;
			});
			return callback(null, result);
	});
	
};




module.exports.getNotificationsForUser = function(user_id,opts,callback) {
	

	opts.limit = (opts.limit) ? opts.limit : 6;
  opts.page = (opts.page) ? opts.page : 1;

	var sql = "SELECT";
	sql += " history.event_id AS event_id,";
	sql += " history.event_type_id AS event_type,";
	sql += " related_user.name AS related_user_name,";
	sql += " related_user.user_id AS related_user_id,";
	sql += " related_user.profile_image_url AS related_user_profile_image_url,"; 
	sql += " post.id as post_id,";
	sql += " post.title as post_title,";
	sql += " post.post_type_id as post_type_id,"; 
	sql += " history.details as details,";
	sql += " history.status as status,";
	sql += " history.created_at as created_at";
	sql += " FROM history AS history";
	sql += " LEFT JOIN posts AS post ON post.id = history.rel_to_post_id";
	sql += " LEFT JOIN user_profile AS related_user ON related_user.user_id =  history.rel_to_user_id";
	sql += " LEFT JOIN user AS user ON ( related_user.user_id =  user.id AND user.status = 0 ) "; 
	sql += " WHERE history.user_id = ? "; 
	sql += " AND (";
	sql += "  history.event_type_id = 2 OR history.event_type_id = 6 ";
	sql += " OR history.event_type_id = 11 OR  history.event_type_id = 12 OR ";
	sql += "  history.event_type_id = 16 )";
	sql += " ORDER BY history.status ASC, history.created_at DESC LIMIT " + (opts.page-1)*opts.limit +", " + opts.limit;
	
	pool.query(sql,[user_id, user_id], function(err, result){
		if (err){
			console.error(err);
			return callback(err);
		} 
		
			result = result.map(function(item){
				item.created_at = moment(item.created_at).fromNow();
				return item;
			});
		
			return callback(null, result);
	});
};


module.exports.markNotificationAsRead = function(notifId, opts, superCallback) {
		var callback = function(err){
		if(superCallback)
		return superCallback();
		else
			if (err)
				console.error(err);
	}
	
	if (!opts.user_id){
		return callback("[HISTORY CONTROLLER] User initial");
	}

	var sql = "UPDATE history SET status = 1 WHERE event_id = ? AND user_id = ?";
	pool.query(sql, [notifId, opts.user_id], function(err, result){
			return callback(err);
	});
};

module.exports.markAllNotificationsAsRead = function(user_id, superCallback) {
	
	var callback = function(err){
		if(superCallback)
		return superCallback();
		else
			if (err)
				console.error(err);
	}
	
	if (!user_id){
		return callback("[HISTORY CONTROLLER] User initial");
	}
	
	var sql = "UPDATE history SET status = 1 WHERE user_id = ?";
	pool.query(sql, [user_id], function(err, result){
		return callback(err);
	});
};



function answerWrittenEmail(userId,postId,callback){
			
			var answeringUser = {};
			var post = {};
			var question = {};
			var questionOwner = {};
	
			async.series([
				function(callback){
					services.checkIfEmailsWanted(userId, function(err, wanted){
						if (err){
							callback(err);
						} else {
							if (wanted){
								console.log("EMAIL WANTED");
								callback();
							} else {
								console.log("EMAIL NOT WANTED");
								callback({ msg:"Email notificaiton switched off"});
							}
						}
					});
				},
				function(callback){
					var sql = "SELECT * FROM posts WHERE id = ?";
					pool.query(sql, [postId], function(err, result){
						if (err){
							callback(err);
						} else {
							if (result.length){
								post = result[0];
								callback();
							} else {
								callback("[HISTORY CONTROLLER] Not sending 'answerWritten' email because post has been not found");
							}
						}
					});
				},
				function(callback){
					var sql = "SELECT * FROM posts WHERE id = ? AND post_type_id = 1";
					pool.query(sql, [post.parent_id], function(err, result){
						if (err){
							callback(err);
						} else {
							if (result.length){
								question = result[0];
								callback();
							} else {
								callback("[HISTORY CONTROLLER] Not sending 'answerWritten' email because question post has been not found");
							}

						}
					});
				},
				
				function(callback){
					var sql = "SELECT profile.user_id as user_id, profile.name as name, user.email as email FROM user_profile as profile INNER JOIN user as user ON user.id = profile.user_id WHERE id = ?";
					pool.query(sql, [question.owner_user_id], function(err, result){
						if (err){
							callback(err);
						} else {
							if (result.length){
								questionOwner = result[0];
								callback();
							} else {
								callback("[HISTORY CONTROLLER] Not sending 'answerWritten' email because question owner has been not found");
							}
						}
					});
				},
				
				function(callback){
					var sql = "SELECT profile.user_id as user_id, profile.name as name, user.email as email FROM user_profile as profile INNER JOIN user as user ON user.id = profile.user_id WHERE id = ?";
					pool.query(sql, [userId], function(err, result){
						if (err){
							callback(err);
						} else {
							if (result.length){
								answeringUser = result[0];
								callback();
							} else {
								callback("[HISTORY CONTROLLER] Not sending 'answerWritten' email because post author has been not found");
							}
						}
					});
				}
			], function(err){
				if (err){
					console.log(err);
					callback(err);
				} else {
					sender.questionAnswered(questionOwner,answeringUser,question,post,function(err){
						if (err){
							console.error(err);
						} else {
							console.log("QUESTION ANSWERED - EMAIL SEND");
						}
						callback();
					});
				}
			});	
		}






function upvoteEmail(upvotingUserId,postId,callback){
			
			var upvotingUser = {};
			var upvotedUser = {};
			var post = {};
	
			async.waterfall([

				function(callback){
					var sql = "SELECT * FROM posts WHERE id = ?";
					pool.query(sql, [postId], function(err, result){
						if (err){
							callback(err);
						} else {
							if (result.length){
								post = result[0];
								callback();
							} else {
								callback({ msg : "Upvote email not sent. The post has not been found!"});
							}
						}
					});
				},
			function(callback){
				services.checkIfEmailsWanted(post.owner_user_id, function(err, wanted){
						if (err){
							callback(err);
						} else {
							if (wanted){
								callback();
							} else {
								callback({ msg:"Email notificaiton switched off"});
							}
						}
					});
				},
				function(callback){
					return callback();
					if ( post.upvotes_count ){
						callback();
					} else {
						callback({msg:"UPVOTES EMAIL: To many emails already send!"});
					}
				},
				
				function(callback){
					var sql = "SELECT profile.user_id as user_id, profile.name as name, user.email as email FROM user_profile AS profile INNER JOIN user as user ON user.id = profile.user_id WHERE id = ?";
					pool.query(sql, [upvotingUserId], function(err, result){
						if (err){
							callback(err);
						} else {
							if(result.length){
								upvotingUser = result[0];
								callback();
							} else {
								callback({ msg  : "Upvoting user was not found. No email sent for the upvote!" });
							}
						}
					});
				},
								function(callback){
					var sql = "SELECT profile.user_id as user_id, profile.name as name, user.email as email FROM user_profile AS profile INNER JOIN user as user ON user.id = profile.user_id WHERE id = ?";
					pool.query(sql, [post.owner_user_id], function(err, result){
						if (err){
							callback(err);
						} else {
							if(result.length){
								upvotedUser = result[0];
								callback();
							} else {
								callback({ msg  : "Upvoting user was not found. No email sent for the upvote!" });
							}
						}
					});
				},
				function(callback){
	
					var sql = "SELECT * FROM history WHERE event_type_id = 13 AND user_id = ? AND rel_to_post_id = ?"; //downvote
					pool.query(sql, [Number(upvotingUserId),Number(postId)], function(err, result){
						if (err){
							callback(err);
						} else {
							console.log(result);
							if ( result.length ){
								console.log("UPVOTE: One email has been already sent, so stoping the flow!");
								callback({msg: "UPVOTE: One email has been already sent, so stoping the flow!"});
							} else {
								callback();
							}
						}

					});
				},
			], function(err){
				if (err){
					console.log(err);
					callback(err);
				} else {
					sender.emailUpvoted(upvotingUser,upvotedUser, post,function(err){
						if(err) throw err;
						callback();
					});
				}
			});	
		}




function commentEmail(commentId,postId,callback){
			var usersCommenting = [];
			var commentingUser = {};
			var postOwner = {};
			var comment = {};
			var post = {};
			async.waterfall([

				function(callback){
					var sql = "SELECT * FROM posts WHERE id = ?";
					pool.query(sql, [postId], function(err, result){
						if (err){
							callback(err);
						} else {
							post = result[0];
							callback();
						}
					});
				},
			
				function(callback){
					services.checkIfEmailsWanted(post.owner_user_id, function(err, wanted){
						if (err){
							callback(err);
						} else {
							if (wanted){
								callback();
							} else {
								callback({ msg:"Email notificaiton switched off"});
							}
						}
					});
				},
				
				function(callback){
					var sql = "SELECT * FROM comments WHERE comment_id = ?";
					pool.query(sql, [commentId], function(err, result){
						if (err){
							callback(err);
						} else {
							comment = result[0];
						
							
							callback();
						}
					});
				},
				
				
				
				function(callback){
					// get details of commenting user!
					var sql = "SELECT profile.user_id as user_id, profile.name as name, user.email as email FROM comments as comment INNER JOIN user_profile as profile ON profile.user_id = comment.owner_user_id INNER JOIN user as user ON user.id = profile.user_id WHERE comment.post_id = ?";
					pool.query(sql, [postId], function(err, data){
						if (err){
							callback(err);
						} else {
							usersCommenting = data;
							callback();
						}
					});
				},
				
				function(callback){
				// get commenting user details
					var sql = "SELECT profile.user_id as user_id, profile.name as name, user.email as email FROM user_profile as profile INNER JOIN user as user ON user.id = profile.user_id WHERE id = ?";
					pool.query(sql, [comment.owner_user_id], function(err, result){
						if (err){
							callback(err);
						} else {
							commentingUser = result[0];
							callback();
						}
					});
				},
				function(callback){
					// get post owner details
					var sql = "SELECT profile.user_id as user_id, profile.name as name, user.email as email FROM user_profile as profile INNER JOIN user as user ON user.id = profile.user_id WHERE profile.user_id = ?";
					pool.query(sql, [post.owner_user_id], function(err, result){
						if (err){
							callback(err);
						} else {
							postOwner = result[0];
							callback();
						}
					});
				}
			], function(err){
				if (err){
					console.log(err);
					callback(err);
				} else {

					if (usersCommenting.length){
					async.eachSeries(usersCommenting, function(otherUserWhoCommented, callback){
					if ( otherUserWhoCommented.user_id !== commentingUser.user_id && commentingUser.user_id !== post.owner_user_id ){
					sender.emailAlsoCommented(commentingUser,otherUserWhoCommented,comment,post,function(err){
						if (err){
							console.error(err);
							callback(err);
						} else {
							callback();
						}
					});	
					}}, function(err){
						if (err){
							console.log(err);
						} else {
							console.log("EMAIL TO OTHER USERS SENT");
						}
					});
					} else {
						console.log("No other person commented on this answer");
					}	

					if (commentingUser.user_id == post.owner_user_id) {
						callback();
					} else {
						
						sender.emailCommented(commentingUser,postOwner,comment,post,function(err){
						if (err){
							callback(err);
						} else {
							callback();
						}
					});
					}
				}
			});
			
		}	




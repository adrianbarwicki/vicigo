
var async = require('async');

var HashtagService = require("../services/HashtagService.js");
var profile = require('./profile.js');
var postController = require('./post.js');
var rankingController = require('./ranking.js');
var services = require('../services/services.js');

var pool = require("../../config/db.js").pool;
var striptags = require('striptags');
var moment = require('moment');



module.exports.getHashtag = function(hashtag, callback) {
  var Hashtag = {};
  async.waterfall([
    function(callback){
      HashtagService.isFollowingHashtag(hashtag,function(err,isFollowing){
      if(err){
        return callback(err);
      }
        Hashtag.isFollowing = isFollowing
    });
    }, 

  ],function(err){
    callback(err,Hashtag);
  });
  
};
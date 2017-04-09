var FeedService = require("../services/FeedService.js");

module.exports = {
  getFeed: getFeed
};

function getFeed (params,callback){
  var feedOptions = {};

  feedOptions = params;

  if (params.userId && typeof params.userId == 'number' ) {
    feedOptions.userId = params.userId;
  } else {
    feedOptions.userId = false;
  }
  
  
  if (params.profileIds) {
    try {
      feedOptions.profileIds = params.profileIds.split(",");
    } catch(err) {
      feedOptions.profileIds = [];
    }
  } else {
    feedOptions.profileIds = [];
  }
  
  FeedService.getFeed(feedOptions, function(err, rFeed) {
			callback(err,rFeed)
	});
}



		

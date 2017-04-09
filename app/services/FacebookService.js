var async = require('async');
var pool = require('../../config/db.js').pool;


var getProfile = function(fbId,token,callback){
		if (!token) {
		return callback({code:"NO_FB_TOKEN"});
		}
		var FB = require('fb');
			FB.setAccessToken(token);
			FB.api('/'+fbId, 'get', {}, function(res) {
								console.log(res);
				var rProfile = {};
				rProfile.id = res.id;
				if(res.email){
					rProfile.emails = [{value : res.email }];
				}
				rProfile.name = {
					givenName : res.first_name,
					familyName : res.last_name,
					displayName : res.name,
				};
				rProfile.gender = res.gender;
				console.log(rProfile);
				callback(null,rProfile);
			});
};
/*
{ id: '502207829931261',                                                                                                              
  email: 'adriansbarwicki@gmail.com',                                                                                         
  first_name: 'Adrian',                                                                                                    
  gender: 'male',                                                                                                                     
  last_name: 'Barwicki',                                                                                                              
  link: 'https://www.facebook.com/app_scoped_user_id/502207829931261/',                                                               
  locale: 'en_GB',                                                                                                                    
  name: 'Adrian Barwicki',                                                                                                            
  timezone: 1,                                                                                                                        
  updated_time: '2016-02-08T22:59:49+0000',                                                                                           
  verified: true }  
	*/
/*
getProfile(502207829931261,"CAAWafwWcGkYBAEdupRE65Io5eL92v4KZB5bBTscAEFmhnx5GTb1CqKcucWS6mxpuUXg2ZCKFD3IbZC8PcVDQcgfrSP7AScfASCeJ1ZAEDQhJGN9ExWOEtgUf2zH5YdgVxjG57lZAZBSJZBJtpXh7kw80uCMlu8mbnEOkIUcuTXsrUqSxqMXTuP0uqu2aDYmi8rTzvZB4PRhDf5eZCqkNDebIa");
*/
var fetchAllPhotos = function(token, params, callback) {

	if (!token) {
		callback(null, {});
		return;
	}
	var FB = require('fb');
	FB.setAccessToken(token);

	var Photos = [];

	var fbAlbums,albumIds,alreadyImportedIds;
	
	async.waterfall([
		function(callback) {
			async.parallel([
				function(callback) {
					async.waterfall([
						function(callback) {
							FB.api('/me/', 'get', {}, function(res) {
								callback(res.error, res);
							});
						},
						function(fbMe, callback) {
							FB.api('/' + fbMe.id + '/albums', 'get', {}, function(response) {
								
					if (response.error) {
						console.log(response.error);
						return callback(response.error);
					}
								
								fbAlbums = response.data;
								console.log(fbAlbums);
								albumIds = response.data.filter(function(item) {
									if(params.profilePhotos){
										return item.name == 'Profile Pictures';
									} else {
										return true; //(item.privacy == 'everyone') ? true : false;
									}
								}).map(function(item) {
									return item.id;
								});

								callback();
							});
						},
					], function(err) {
						callback(err);
					});
				},
			], function(err) {
				callback(err);
			});
		},

		function(callback) {

			//async.eachSeries(albumIds, function(albumId, callback) {
				FB.api("/" + albumIds[0] + "/photos?fields=images&limit=100", function(photosResponse) {
					
					if (photosResponse.error) {
						console.log(photosResponse.error);
						return callback(photosResponse.error);
					}
					
					Photos = photosResponse.data;
					callback();
				});

			//}, function(err) {
			//	callback(err);
			//});
		}
	], function(err) {
		if(err){
			console.error(err);
			callback(err);
		} else {
			console.log(Photos.length, " photos have been fetched from Facebook...");
			callback(err, Photos);
		}
	});

};


module.exports = {
	getProfile : getProfile,
	fetchProfilePhotos : fetchAllPhotos,
	fetchAllPhotos: fetchAllPhotos,
};
var async = require('async');
var moment = require("moment").pool;
var randtoken = require('rand-token');

var UploadService = require("../services/upload.js");
var ProfileService = require("../services/profileService.js");
var PicService = require("../services/PicService.js");
var PostService = require("../services/PostService.js");

var sharp = require("sharp");

var ACCEPTED_FILE_FORMATS = ["gif","jpg"];

var processAndSaveImage = function(file,params,callback){
	const imageBuffer = new Buffer(file.buffer);

	if (params.inputFormat == "gif") {
		return callback(null, imageBuffer);
	}

	var options = {};

	options.quality = 70;
	options.inputFormat = file.mimetype.split("/")[1];
	options.userId = params.userId;
	options.outputFormat =  ACCEPTED_FILE_FORMATS.indexOf(options.inputFormat) > -1 ? options.inputFormat : "jpg";

	var imagePost = {};

	var dims = [
		// [null,null, "source"],
		// [150,150,"avatar"],
		// [320,320,"xs"],
		// [414,414,"sm"],
		[ 640, 640, "md"],
		// [1200,630,"bg"],
		// [1280,1280,"lg"],
		// [64,64,"icon"]
	];
			
	async.waterfall([
		callback => {
				if(imageBuffer.length < 1000000) {
					return callback(null, imageBuffer);
				}
			
				sharp(imageBuffer).resize(1200, null).toBuffer(function(err, minBuffer) {
   						if(err) {
							console.error("[SHARP ERROR] Proccessing error");
							console.error(err);

							return callback(err);
						} else {
							return callback(null, minBuffer);
						}
  			  	});
		},
		(minImageBuffer,callback) => {

		 async.eachSeries(dims, (dim, callback) =>{
				async.waterfall([
					callback => {
							options.width = dim[0];
							options.height = dim[1];

							return callback(err, new Buffer(minImageBuffer));
					},
					(buffer, callback) => {
							var dimCode = !dim[0] && !dim[1] ? 'source' : dim[0]+"x"+dim[1];
							var key =  "img/"+options.userId + "/" + dimCode + "/" + randtoken.generate(50) + "." + options.outputFormat;
							
							UploadService.uploadImage({
								body: buffer,
								key: key
							}, function(err,loc_path){
								if(err){
									console.error(err);
									return callback(err);
								}

									imagePost["image_" + dim[2] + "_url"] = loc_path;

									if(dim[0] == 640){
										imagePost.image_url = loc_path;
									}

									return callback(err,loc_path);
							});
					},
					(locPath, callback) => PicService.createImage({
						user_id : params.userId,
						image_url : locPath,
						width : dim[0],
						height : dim[1],
						type : dim[2]
					}, err => callback(err)),	
				], err => callback(err));
			}, err => callback(err,imagePost));
				
			}],function(err,rImagePost){
					return callback(err,rImagePost);
			});

}

module.exports = {
  processAndSaveImage: processAndSaveImage
};

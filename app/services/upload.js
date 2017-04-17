var fs = require('fs');
var multer = require("multer");
var async = require('async');
var AWS = require('aws-sdk');
var randomstring = require("randomstring");
var ImageMethods = require("../methods/ImageMethods.js");
var poolMagicPic = require("../../config/db.js").poolMagicPic;
AWS.config.region = 'eu-central-1';
AWS.config.update({
	accessKeyId: process.env.VICIGO_AWS_KEYID,
	secretAccessKey: process.env.VICIGO_AWS_SECRET
});

var s3 = new AWS.S3();

var processImageBuffer = ImageMethods.processImageBuffer;

var uploadImage = function(params, callback) {
      var opt = {};
			params.bucket = params.bucket ? params.bucket : "vicigo";
	
		  opt.Bucket =  params.bucket;
		  opt.Body =  params.body;
			opt.Key = params.key;
			opt.ContentType = "image/jpeg";

			s3.upload(opt, function(err, pres) {
						if (err) {
							console.error(err);
							callback(err);
						} else {
							if(params.directLink){
								console.log(pres);
								callback(null,pres.Location);
							} else {
									callback(null,"http://cdn.vicigo.com/"+opt.Key);
							}
						}
			});
};

var logImage = function(image,callback){
	
	poolMagicPic.query("INSERT INTO pics SET ?",image,function(err,result){
	if(err){
		console.log(err);
	}
	if(callback){
		return callback ? callback(err) : true;
	}
		
	});
};


var processImage = function(buffer, options, callback) {
	
var img = {};	
	
options.inputFormat = (options.inputFormat) ? options.inputFormat : "jpg"; 
return callback('lwip has been removed');
/** 
lwip.open(buffer,options.inputFormat,function(err, image){
if(err){
	console.log(err);
	return callback(err);
}
	
	
  options.width = (options.width) ? options.width : 600;
  options.heigth = (options.height) ? options.height : null;
  options.quality = (options.quality) ? Number(options.quality) : 70;	
  options.outputFormat = (options.outputFormat) ? options.outputFormat : "jpg"; 	
	
	


	
	if(!options.scale){
  var iWantThatWidth = options.width;
  var ratio = iWantThatWidth/ image.width();
	ratio = (ratio < 1) ? ratio : 1;
	options.scale = ratio;
	}
	console.log(options);
  image.batch()
    .scale(options.scale)
		.toBuffer( options.outputFormat ,{ quality: options.quality }, function(err,outputBuffer){
	  if (err){
		  console.error(err);
		  return callback(err);
	  } 
		img.magic_buffer = outputBuffer;
		
		return callback(null,img);
    });
});		
*/
};

module.exports = {
	logImage : logImage,
	uploadImage : uploadImage,
	processImage : processImage,
	processImageBuffer : processImageBuffer,
};


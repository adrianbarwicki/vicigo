var async = require('async');
var sizeOf = require('image-size');
var extend = require('extend');

var pool = require('../../config/db.js').pool;

var createImage = function(Image,callback) {
  
	var sql = "INSERT INTO images SET ?";
	console.log(Image);
	pool.query(sql, Image, function(err, result) {
		return callback(err, result);
	});
  
};


var getImgBufferProps = function(imgBuffer,callback){	
	sizeOf(imgBuffer, function (err, dimensions) {
  	return callback(dimensions.width, dimensions.height);
	});	
};

var processImageBuffer = function(imgBuffer, opts, callback){
	return callback(null, imgBuffer);
};

module.exports = {
	processImageBuffer: processImageBuffer,
	getImgBufferProps: getImgBufferProps,
	createImage: createImage,
};
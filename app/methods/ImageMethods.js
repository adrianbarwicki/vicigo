var async = require('async');
var request = require('request');
var randtoken = require('rand-token');

function download(uri, params, callback) {
  console.log("Downloading %s...",uri);
	request.get({
		encoding: null,
		url: uri,
	}, function(err, res, body) {
		return callback(err, res, body);
	});
}



function getFromLinkAndProcess(url, options, callback) {
		download(url, {}, function(err, res, body) {
			if (err) {
				console.log(err);
				return callback(err);
			}

			options.inputFormat = res.headers['content-type'].split("/")[1];
			if(!options.noProccess){
				options.width = (options.width) ? options.width : 640;
				options.height = (options.height) ? options.height : null;
				options.quality = (options.quality) ? options.quality : 80;
			}
			
			options.outputFormat = "jpg";
			
			processImageBuffer(body, options, function(err, rImageBuffer) {
				if(err){
          callback(err);
        }else{
          var params2 = {};
				  params2.body = rImageBuffer;
				  params2.key = randtoken.generate(50) + "." + options.outputFormat;
          callback(null,params2);
        }
		});
	});
 }

function processImageBuffer(buffer, options, callback) {
	return callback(null,buffer);

	if (!options.width && !options.height) {
		return callback(null,buffer);
	}
		
	var img = {};	
		
	options.inputFormat = (options.inputFormat) ? options.inputFormat : "jpg"; 

	return callback('lwip has been removed');
}


module.exports = {
  processImageBuffer : processImageBuffer,	
  getFromLinkAndProcess : getFromLinkAndProcess,
};
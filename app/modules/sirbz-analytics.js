var request = require('request');
var async = require('async');

var _api = {
  base: "http://sir.bz",
  urls: {
    keywordsAnalytics: "/api/tool/keyword_density",
    urlShortener: "/api/shorten_url"
  },
  buildURL: function(toolName){
   return this.base + this.urls[toolName]; 
  }
}

var urlShortener = function(long_url, params, callback){
    var url = _api.buildURL("urlShortener");

    request.post(url, {form: { url : long_url }}, function (err, response, body) { 
      if (err) {
        return callback(err);
      }

      return callback(err, JSON.parse(body));
    });
};

var textAnalytics = function(text, callback){
    var url = _api.buildURL("keywordsAnalytics");
    
    request.post(url, {
      form: {
        text: text
      }
    }, function (err, response, body) {
      var analytics = {};

      try {
        analytics = JSON.parse(body);
      } catch(err) {
        analytics = {};
      }

      if (!module.parent) {
        console.log(url);
        console.log(body)
      }

      return callback && callback(err, analytics);
    });
};

var exportFns = {
    urlShortener: urlShortener,
    textAnalytics: textAnalytics
};

if (module.parent) {
    module.exports = exportFns;
} else {
    exportFns[process.argv[2]](process.argv[3], (err, data) => {
      if (err) {
        return console.error(err);
      }
      console.log(data);
    });
} 


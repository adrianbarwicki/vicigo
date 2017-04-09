var ViciAuth = require('../../config/vqAuthProvider');
	
var isBot = function (userAgent,push) {
	userAgent = userAgent ? userAgent.toLowerCase() : "unknown user-agent";

	if (userAgent.indexOf("facebook") > -1 ||
		userAgent.indexOf("google") > -1 ||
		userAgent.indexOf("bing") > -1 ||
		userAgent.indexOf("bot") > -1 ||
		userAgent.indexOf("spider") > -1 ||
		userAgent.indexOf("quora") > -1 ||
		push == "true") {
		return true;
	} else {
		return false;
	}
};
	
var authHeaders = function(req) {
	var token;
	if(req.headers['x-auth-token']) {
				token = req.headers['x-auth-token'];
	} else if (req.body["x-auth-token"]) {
				token = req.body["x-auth-token"];
	}
		
		return token;
		
};

var readHeaders = function(req, res, next) {
	var token = authHeaders(req);
	if(!token){
		return next();
	}
	ViciAuth.checkToken(token,function(err,rUser){
		if(rUser){
			req.user = { id : rUser.userId };
			return next();
		} else {
			return next();
		}
	});
	
};

var isLoggedIn = function(req, res, next) {

	var AUTH_METHOD, token;
	if( req.headers['x-auth-token']  || req.body["x-auth-token"] ) {
			AUTH_METHOD = "tokens";
			token = authHeaders(req);
	}else{
		AUTH_METHOD = "sessions";
	}
	
	


	if(AUTH_METHOD=="tokens"){
	if(!token){
		return res.status(401).send("Unauthorized");
	}

	ViciAuth.checkToken(token,function(err,rUser){
		if(rUser){
			req.user = { id : rUser.userId };
			return next();	
		} else {
			return res.status(401).send("Token not valid");
		}
	});
	} 
	
	if(AUTH_METHOD=="sessions"){
		if (req.isAuthenticated()){
				return next();
		} else {
			return res.status(401).send("Session not valid. ");
		}	
	}
};

var sendResponse = function(res, err, data) {
	if (err) {
		var codes400 = ["NO_PASSWORD","WRONG_PASSWORD"];

		if (codes400.indexOf(err.code)>-1) {
			return res.status(400).send({
				code: err.code
			});
		}

		if (err.status) {
			return res.status(err.status).send(err);
		} 

		return res.status(500).send(err);
	} else {
		res.status(200).send(data);
	}
};



module.exports = {
	isBot: isBot,
	isLoggedIn: isLoggedIn,
	sendResponse: sendResponse,
	readHeaders: readHeaders
};

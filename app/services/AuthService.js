
var async = require("async");
var pool = require("../../config/db.js").pool;


function logLogin(userId,medium) {
  if (!userId) {
    return console.error("logLogin emptry userId")
  } else {
    console.log("UserId", userId, "logged in.");
  }
  var loginObj = {};
  loginObj.user_id = userId;
  if(medium){
    loginObj.medium=medium;
  }
    
  pool.query("INSERT INTO login_history SET ?",loginObj, function(err, result) {
    return err ? console.error(err) : true;
  });
}

function createNewAccount(userId,username,profile,callback) {

  var newProfile = {}; 
	console.log(userId,username,profile,callback);

  newProfile.user_id = userId;
	
	if(username){
		 newProfile.name = username;
	}
  
  if(profile.profileImageUrl){
    newProfile.profile_image_url = profile.profileImageUrl;
  }
	
  if(profile.gender){
    newProfile.gender = profile.gender;
  }
	
  if(profile.fullname){
    newProfile.fullname = profile.fullname;
  }
  
	
	
	
  async.waterfall([

    function(callback) {
      var sql = "INSERT INTO user_profile SET ?";
      pool.query(sql, newProfile, function(err, result) {
        if (err) {
          return callback(err);
        }

        return callback();
      });
    },    
  ], function(err) {
		console.log(callback);
		if(callback){
			callback(err);
		}else{
			console.log("No callback");
		}
    
  });
}




module.exports = {
  createNewAccount: createNewAccount,
  logLogin: logLogin
};
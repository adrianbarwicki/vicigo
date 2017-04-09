
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our user model
var postSchema = mongoose.Schema({
	
	
	authorId : String,
	title : String,
	shortDescription : String,
	description : String,
	body: String,
	category : String,
	keywords :  String,
	timestamp : Date,
	url : String,
	recommendations : [ { text : String } ],
   
});



// create the model for users and expose it to our app
module.exports = mongoose.model('Post', postSchema);
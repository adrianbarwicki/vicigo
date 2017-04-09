var mandrill = require('mandrill-api/mandrill');

var mandrill_client = new mandrill.Mandrill(process.env.VICIGO_MANDRILL);

var emailFooter = "";
emailFooter +=	"<p>best,</p>";
emailFooter +=  "<p>vicigo team</p>";
emailFooter +=  "<br>";	
emailFooter +=  "<h3>follow #vicigo on <a href='https://www.facebook.com/vvicigo'>facebook</a>!</h3>";
emailFooter +=  "<br>";
emailFooter +=  "<hr>";
emailFooter += "<p>Vicigo learns about your interests and tastes as you use it and gives you back what matters most to you.</p>";
emailFooter += "<p>We are focused on being the best place to share to an audience that is interested in your topic.</p>";
emailFooter +=	"<a href='http://vicigo.com'>vicigo</a> is a product of viciqloud UG (haftungsbeschränkt)";
emailFooter +=  "<br> made in heidelberg, germany";
emailFooter +=  "<br> <a href='http://www.vicigo.com/impressum'>impressum</a>";

//emailFooter += "<br> <small><a href='http://vicigo.com/unsubscribe/profile/"+upvotedUser.user_id+"/unsubscribe'>unsubscribe</a></small>";;

function sendEmail(email, subject, html, callback){
	var fromEmail = ( subject == "hello from vicigo" ) ? "adrian.barwicki@viciqloud.com" : "notifications@vicigo.com";
	var message = {
    "html": html,
    "text": html,
    "subject": subject,
    "from_email": fromEmail,
    "from_name": "Vicigo",
    "to": [{
            "email": email,
            "type": "to"
        }]
	};
var async = false;

mandrill_client.messages.send({"message": message }, function(result) {
    console.log(result);
	callback(null, result);
}, function(e) {
	console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
	callback(e);
});	
}







module.exports.emailCommented = function(commentingUser,postOwner,comment,post,callback){
	
var postTypeText;
	
if ( post.post_type_id == 1 ){
	postTypeText = "question";
}
if ( post.post_type_id == 2 ){
	postTypeText = "answer";
}	
if ( post.post_type_id == 3 ){
	postTypeText = "blog post";
}
	
if ( post.post_type_id == 4 || post.post_type_id ==  5 ){
	postTypeText = "pic";
}		
var subject = commentingUser.name + " commented on your " + postTypeText + "!" ;
var html =  "<h2><b>"+commentingUser.name+" commented on your "+ postTypeText + "!</b></h2>";
html +=  "<p>Comment:\"" + comment.body + "\"</p>";
html +=  "<p>To see all the comments, visit: </p>";
html +=  "<p><a href='http://vicigo.com/post/"+ post.id +"'>vicigo.com/post/" + post.id + "</a></p>";
html +=  emailFooter;	


sendEmail(postOwner.email, subject, html, function(err){
		if (err){
			callback(err);
		} else {
			callback();	
		}
});
	
};	



module.exports.emailAlsoCommented = function(commentingUser,otherUserWhoCommented,comment,post,callback){
	
var postTypeText;
	
if ( post.post_type_id == 1 ){
	postTypeText = "the question";
}
if ( post.post_type_id == 2 ){
	postTypeText = "the answer";
}	
if ( post.post_type_id == 3 ){
	postTypeText = "the blog post";
}
if ( post.post_type_id == 4 || post.post_type_id ==  5 ){
	postTypeText = "pic";
}
var subject = commentingUser.name + " also commented on " + postTypeText + " that you have commented!" ;
var html =  "<h2><b>"+commentingUser.name+" commented on "+ postTypeText + " that you have commented!</b></h2>";
html +=  "<p>Comment:\"" + comment.body + "\"</p>";
html +=  "<p>To see all the comments, visit: </p>";
html +=  "<p>www.vicigo.com/post/" + post.id + "</p>";
html +=  "<p>Best,</p>";	
html +=  "<p>Vicigo Team</p>";

sendEmail(otherUserWhoCommented.email, subject, html, function(err){
		if (err){
			callback(err);
		} else {
			callback();	
		}
});
	
};



module.exports.viewTresholdEmail = function(user,post,views,callback){
	
var postTypeText;

if ( post.post_type_id == 1 ){
	postTypeText = "question";
}
if ( post.post_type_id == 2 ){
	postTypeText = "answer";
}	
if ( post.post_type_id == 3 ){
	postTypeText = "blog post";
}	
if ( post.post_type_id == 4 || post.post_type_id ==  5 ){
	postTypeText = "pic";
}
	
var subject = "vicigo pulse - " +views + " views on your post";
	
var html =  "<h3><b>your post has been seen "+views+" times!</b></h3>";
//html += "<p>your next view target on this post : " + (views * 10) + "!</p>"

if( Number(post.post_type_id) !== 4 ){
	html +=  "<p>to see your " + postTypeText + " and all the upvotes, visit: </p>";
	html +=  "<p><a href='http://vicigo.com/post/"+post.id+"'>vicigo.com/post/"+post.id+"</a></p>";
} else {
	html +=  "<p>to see your " + postTypeText + " and all the upvotes, click on the pic </p>";
	html +=  "<a href='http://vicigo.com/post/"+post.id+"'><img width=400px; src='"+post.image_url+"'></a>";
}

html +=  emailFooter;
	
sendEmail(user.email, subject, html, function(err){
		if (err){
			callback(err);
		} else {
			callback();	
		}
});
	
};


module.exports.emailUpvoted = function(upvotingUser,upvotedUser, post,callback){
	
var postTypeText;

if ( post.post_type_id == 1 ){
	postTypeText = "question";
}
if ( post.post_type_id == 2 ){
	postTypeText = "answer";
}	
if ( post.post_type_id == 3 ){
	postTypeText = "blog post";
}	
if ( post.post_type_id == 4 || post.post_type_id ==  5 ){
	postTypeText = "pic";
}
var subject = upvotingUser.name + " upvoted your " + postTypeText + "!";
	
	var html =  "<h3><b><a href='http://vicigo.com/profile/"+upvotingUser.user_id+"'>"+upvotingUser.name+"</a></b> upvoted your ";
	if(Number(post.post_type_id) == 4) {
			html +=    postTypeText + "!</h3>";
	} else {
		html +=    postTypeText + " !</h3>";
	}

	html +=  "<p>your post has</p>";
	html +=  "<ul>";
	html +=  "<li>"+post.views +" views</li>";
	html +=  "<li>"+post.upvotes_count+" upvotes</li>";
	html +=  "<li>"+post.comment_count+" comments</li>";
	html +=  "</ul>";
if( Number(post.post_type_id) !== 4 ){
	html +=  "<p>to see your " + postTypeText + " and all the upvotes, visit: </p>";
	html +=  "<p><a href='http://vicigo.com/post/"+post.id+"'>vicigo.com/post/"+post.id+"</a></p>";
} else {
	html +=  "<p>to see your " + postTypeText + " and all the upvotes, click on the pic </p>";
	html +=  "<a href='http://vicigo.com/post/"+post.id+"'><img width=400px; src='"+post.image_url+"'></a>";
}

html +=  emailFooter;
	
sendEmail(upvotedUser.email, subject, html, function(err){
		if (err){
			callback(err);
		} else {
			callback();	
		}
});
	
};




module.exports.emailForgottenPassword = function(userId, email, token, callback){
	
var html = "<p>Hello!</p>";
html +=  "<p>Under the following link you will be able to set up your new password:</p>";
html +=  "<p><a hreg='http://vicigo.com/pw/"+userId+"/"+token+"/?pwreset=true'>http://vicigo.com/pw/"+userId+"/"+token+"/<a></p>";
html +=  "<p>The link will be valid only for the next 24 hours.</p>";
html +=   emailFooter;	

	sendEmail(email, "Password Reset", html, function(err){
		if (err){
			callback(err);
		} else {
			callback();	
		}
	});
};


module.exports.emailWelcome = function(email, callback){
	
var html = "<p>Hello!</p>";
html += "<p>Thanks a lot for registering on Vicigo.</p>";
html += "<p>With this short message, we would like to summarize a really cool stuff on Vicigo:</p>";	
html += "<h3>Personalised content</h3>";
html += "<p>Vicigo learns about your interests and tastes as you use it and gives you back what matters most to you. Vicigo is the best place to browse photos, articles and thoughts online.</p>";
html += "<h3>Share your moments</h3>";
html += "<p>Vicigo is focused on being the best place to share to an audience that is interested in your topic, with great writing tools and incredible distribution for writers of all kinds. Vicigo is the best place to write and share photos online.</p>"
html += "<h3>Spartan look & no ads</h3>";
html += "<p>Vicigo has focused on simplicity and inspiring creativity through solving problems with thoughtful product design. Only the content matters that interests you and you will see only this.</p>";
html += "<hr>";	
html += "<p>We have some really cool folk on Vicigo -	artists, entreprenuers, travellers, even one girl from Middle East writing about the ongoing mess.</p>";
html += "<p>Check out few out of the currently trending hashtags : <a href='http://vicigo.com/hashtag/himalayas'>#himalayas</a>, <a href='http://vicigo.com/hashtag/dariuszka'>#dariuszka</a>,<a href='http://vicigo.com/hashtag/isis'>#isis</a>, <a href='http://vicigo.com/hashtag/travel'>#travel</a>, <a href='http://vicigo.com/hashtag/indien'>#indien</a> </p>";
html += "<p>You can follow some of the most interesting users here: <a href='http://vicigo.com/profile/calisi'>@calisi</a>, <a href='http://vicigo.com/profile/dariuszka'>@dariszka</a>, <a href='http://vicigo.com/profile/viciceo'>@viciceo</a>, <a href='http://vicigo.com/profile/stephango'>@stephango</a> </p>";
html +=	"<p>Best,</p>";
html +=  "<p>Vicigo Team</p>";
html +=  "<br>";	
html +=  "<h3>Follow #vicigo on <a href='https://www.facebook.com/vvicigo'>Facebook</a>!</h3>";
html +=  "<br>";
html +=  "<hr>";
html +=	"<a href='http://vicigo.com'>vicigo</a> is a product of Viciqloud UG (haftungsbeschränkt)";
html +=  "<br>Made in Heidelberg, Germany";
html +=  "<br><a href='http://www.vicigo.com/impressum'>Impressum</a>";


	sendEmail(email, "Welcome on Vicigo", html, function(err){
		if (err){
			return callback ? callback(err) : console.error(err);
		} else {
			return callback ? callback() : console.log("Welcome email has been sent to"  + email );	
		}
	});
};





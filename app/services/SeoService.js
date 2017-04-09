			var metaDefault = {
				title: "Vicigo",
				author: 'Vicigo',
				description: 'explore the world of hashtags - #vicigo makes it easy to browse the most interesting content with hashtags - photos, articles and thoughts.',
				robots: 'index, follow',
				keywords: 'vicigo,viciqloud,hashtag,information,question,answer,social media,share,blog,post,technology',
				ogTitle: "#vicigo",
				ogSite_name: "Vicigo",
				ogUrl: "http://vicigo.com/",
				ogDescription: "explore the world of hashtags - #vicigo makes it easy to browse the most interesting content with hashtags - photos, articles and thoughts.",
				fbAppId: 1577245229193798,
				ogType: "website",
				ogLocale: "locale",
				articlePublisher: "https://www.facebook.com/vvicigo",
				ogImage: "http://www.vicigo.com/img/fb_post.png",
				twitterTitle: "#vicigo",
				twitterUrl: "http://www.vicigo.com/",
				twitterDescription: "explore the world of hashtags",
			};






			module.exports = {
				getDefault : function(){
					return metaDefault;
				},
				
				
				getForHashbook : function(hashbook) {
					var title = hashbook.blog_title;
          var url = "http://vicigo.com/hashbook/"+hashbook.blog_slug;
          var desc = hashbook.blog_title + " * " + hashbook.blog_desc;
					desc += " * Hashbook on Vicigo by " ;
					if(hashbook.author_fullname){
						desc += hashbook.author_fullname + " "
					}
					desc += " @" + hashbook.author_username;
          return {
           "title"  : title,
           "description": desc,
           "author" : hashbook.author_username,
           "ogTitle" : title,
           "ogDescription" : desc,
           "twitterDescription" : desc,
           "twitterTitle" : title,
           "ogUrl" : url,
           "ogImage" : (hashbook.blog_bg_picture) ? hashbook.blog_bg_picture : "http://www.vicigo.com/img/fb_post.png",
          };
        },
				
				
				getForPost : function(post) {
					var  title;
          var url = "http://vicigo.com/post/"+post.post_id;
					if (post.post_type_id == 4 || post.post_type_id == 5){
						title = "Image on Vicigo by @"+post.author_name + " | Vicigo";
					} else {
						title = post.post_title + " by @"+post.author_name + " | Vicigo";
					}
          var childPics = post.childPics ? post.childPics : [];
          var desc = post.hashtags.map(function(item) {return "#"+item.hashtag; }).join(", ");	
          return {
           "title"  : title,
           "description": desc,
           "author" : post.author_name,
           "ogTitle" : title,
           "ogDescription" : desc,
           "twitterDescription" : desc,
           "twitterTitle" : title,
           "ogUrl" : url,
           "ogImage" : (post.post_image_url) ? post.post_image_url : "http://www.vicigo.com/img/fb_post.png",
					 "ogImages" : childPics.map(function(item){ return item.image_url; })
          };
        },
  

				getForHashtag : function(hashtag) {

					var title = "Hashtag " + hashtag + " | Vicigo photos and articles";
					var desc = "Photos, posts and articles with the hashtag '"+hashtag+"' on Vicigo.";
					var url = "http://vicigo.com/hashtag/"+hashtag;

          return {
           "title"  : title,
           "description": desc,
           "author" : "Vicigo",
           "ogTitle" : title,
           "ogDescription" : desc,
           "twitterDescription" : desc,
           "twitterTitle" : title,
           "ogUrl" : url,
           "ogImage" :  "http://www.vicigo.com/img/fb_post.png"
          };

				},
				
				getForProfile : function(profile) {

					var keywords = profile.hashtags.map(function(item) {return "#"+item.hashtag; }).join(", ");	
					var title = "@"+profile.name;
					title += (profile.title) ? ( ", " + profile.title ) : "";
					title += "  | Vicigo";
					
				  var desc = "The newest photos and articles from @"+profile.name+"." 
					desc += (profile.title) ? " " + profile.title  : "";
					desc += " " + keywords;
					

					var url = "http://vicigo.com/profile/"+profile.user_id;

          return {
           "title"  : title,
           "description": desc,
           "author" : profile.name,
           "ogTitle" : title,
           "ogDescription" : desc,
           "twitterDescription" : desc,
           "twitterTitle" : title,
           "ogUrl" : url,
           "ogImage" :  "http://www.vicigo.com/img/fb_post.png"
          };

				}
        
      }; 
				
	
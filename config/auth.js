module.exports = {
    'viciAuth' : {
      "appKey": process.env.VICIGO_VA_APP_KEY,
      "apiKey": process.env.VICIGO_VA_API_KEY
    },
    'facebookAuth' : {
        'clientID': '1577245229193798', // your App ID
        'clientSecret': process.env.VICIGO_FB_SECRET, // your App Secret
        'callbackURL': 'http://vicigo.com/auth/facebook/callback'
    },
};

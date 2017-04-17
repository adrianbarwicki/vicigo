const ViciAuth = require('ViciAuthSDK')({
	appKey: process.env.VICIGO_VA_APP_KEY,
	apiKey: process.env.VICIGO_VA_API_KEY
}, undefined, undefined /*, { host: 'localhost', port: 5000 } */);

module.exports = ViciAuth;

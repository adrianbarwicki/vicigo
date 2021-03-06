var express = require('express');
var app = express();
var port     =  3010;
var cors = require('cors');
var passport = require('passport');
var flash    = require('connect-flash');
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var expressLayouts = require('express-ejs-layouts');
var multer = require('multer');
var compression = require('compression');
var minify = require('express-minify');


app.get('/*', function(req, res, next) {
	if(!req.headers.host){
		 next();   
	} else{
	  if (req.headers.host.match(/^www/) !== null ) {
    res.redirect('http://' + req.headers.host.replace(/^www\./, '') + req.url);
 		 } else {
    next();     
  	}
	}
});

//app.use(compression());
app.use(compression({filter: function(req,res){ return true; } } ));
app.use(cors({
	//origin: ['http://studentask.de','http://www.studentask.de']
}));
app.use(function(req, res, next){
    res._uglifyMangle = true;
	
    next();
});


app.set('layout', 'bin');
//app.locals.pretty = false;
app.set('json spaces', 4);
// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(expressLayouts);

/**
require('./config/passport')(passport);
app.use(session({ secret: 'ilovevicigo' }));
app.use(passport.initialize());
app.use(passport.session());
*/

app.use(cookieParser()); 
app.use(bodyParser()); 
app.use(flash());
app.use("/js", express.static(__dirname + "/public/js"));
app.use("/img", express.static(__dirname + "/public/img"));
app.use("/css", express.static(__dirname + "/public/css"));
app.use("/templates", express.static(__dirname + "/public/templates"));
app.use("/lib", express.static(__dirname + "/public/lib"));
app.use('/libs/', express.static(__dirname + '/node_modules'));

/**
require('./app/policy.js')(app, passport);
require('./app/api.js')(app, passport); 
require('./app/routes.js')(app, passport);
 */

app.use('/libs', express.static(__dirname + '/node_modules'));

app.get("/*", function(req, res, next) {
	res.sendfile("app.html", { root: __dirname + "/public" });
});

var server = require('http').Server(app);

server.listen(port, function() {
	var host = server.address().address;
	var port = server.address().port;

	console.log('VICIGO app listening at http://%s:%s', host, port);
});

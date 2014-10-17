// ---------------- Dependencies --------------
var express = require('express');
var main = require('./routes/main');
var http = require('http');
var path = require('path');
var app = express();
var bodyParser = require('body-parser');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

// -------------- environments --------------
app.use(express.cookieParser('very secret'));
app.use(express.session());
app.set('port', process.env.PORT || 3300);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/process', multipartMiddleware);
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// ---------------development only---------------------
if ('development' == app.get('env')) {
  app.use(express.errorHandler({secret: '1234567890QWERTY'}));
}

//----------------- start server -------------------------
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
  main.process();
});
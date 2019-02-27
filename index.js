var FitbitApiClient= require('fitbit-node');
var express = require('express');
var router= express.Router();
var app= express();
var config = require('config');
var cookieParser = require('cookie-parser');
var Parse= require('parse');
//var router = express.Router();
//var http = require('http');
var CLIENT_ID = '22DCGZ';
var CLIENT_SECRET = '3c1114725f32640d4fe7579fdf1ac67d';
var CODE= '21453870d2fb2ee8cec6e46e3c04e06931ae4aa7';
router.use(cookieParser());

var fitbit = new FitbitApiClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    apiVersion: '1.2'
});

// parse objects
var Notification = Parse.Object.extend('HC_notification');
var SensorSubscription = Parse.Object.extend('HC_sensor_subscription');
var URL= fitbit.getAuthorizeUrl(
        'activity heartrate location nutrition profile settings sleep social weight',config.serverURL,'login'
        );
//,'login cosent'
app.use('/',router);

router.get('/debug', (req,res)=>{
	res.send('the URL is '+URL);
});

router.get('/auth/:userId',(req, res) => {

  //  res.cookie('fitbitUser', req.params.userId);

    //TODO: BECAUSE THIS REDIRECTS TO NUCOACH, IT CAUSES A PROBLEM IN COOKIES. update the app.
    res.redirect(URL); 
        //+ '/sensors/fitbit/callback'

   // res.send(fitbit.getAccessToken(req.query.code,)); 


});


router.get("/callback", (req, res) => {
	// exchange the authorization code we just received for an access token

	fitbit.getAccessToken(req.query.URL, config.serverURL).then(result => {
		// use the access token to fetch the user's profile information
		fitbit.get("/profile.json", result.access_token).then(results => {
			res.send(results[0]);
		}).catch(err => {
			res.status(err.status).send(err);
		});
	}).catch(err => {
		res.status(err.status).send(err);
	});
});
app.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');
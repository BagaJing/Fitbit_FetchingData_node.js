/*
Author : Jing Kang
start at: 24/2/2019
today date: 5/3/2019
status: in progress 

*/

/*require packages*/
var FitbitApiClient= require('fitbit-node');
var express = require('express');
var router= express.Router();
var app= express();
var config = require('server-config');
var cookieParser = require('cookie-parser');
var moment = require('moment');

/*Fitbit CLient password*/
var CLIENT_ID = '22DCGZ';
var CLIENT_SECRET = '9a9bc5ff34992717f7d7cc1f391a4268';
var fitbit = new FitbitApiClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    apiVersion: '1.2'
});

/*other variables*/

//running turns
var runTurns = 1;

app.use('/',router);
router.use(cookieParser());
router.get('/auth/:userId',(req, res) => {

    //res.cookie('fitbitUser', req.params.userId);

    res.redirect(fitbit.getAuthorizeUrl(
        'activity heartrate location nutrition profile settings sleep social weight',config.serverURL,'login')); 
});

router.get("/callback", (req, res) => {
	fitbit.getAccessToken(req.query.code,config.serverURL).then(auth => {
		// when we are here, we get the access token and user ID// then we save the access in database
		
		// use the access token to fetch the user's information
	fitbit.get("/activities/heart/date/today/1d.json", auth.access_token).then(results => {
		//before save to database, we need to check the user subscribe or not by checking userId in database
				console.log(results[0]['activities-heart'][0].value.restingHeartRate);
				res.send(results[0]['activities-heart'][0].value);

		}).catch(err => {res.status(err.status).send(err);

		});
	       }).catch(err => {res.status(err.status).send(err);});
});

app.listen(3000);
console.log('Server running at http:localhost:3000/');
/*
Author : Jing Kang
start at: 24/2/2019
today date: 11/3/2019
status: in progress 
Recent change:
	create a bakup for access_token and refresh_token to avoid the failure of invalid_grant
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

/*connect database and open*/
var mongoose = require('mongoose');
	mongoose.connect('mongodb+srv://Suwarna_proj:1!Ambadas@clustermongodb-zj7du.mongodb.net/test?retryWrites=true',{ useNewUrlParser: true });
var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function (callback) {
    console.log("MongoDB Opened!");
    });
var profile = mongoose.Schema({
     access_token:{type:String},
     refresh_token:{type:String},
     userID:{type:String},
     name:{type:String},
     gender:{type:String},
     DailySteps:{type:Number},
     DailySleep:{type:Number},
     AverageHR:{type:Number},
     updatedDate: { type: Date, default: Date.now }
    });
var profileModel = mongoose.model('profile',profile);

// access_token backup
var backup = mongoose.Schema({
	 access_token:{type:String},
     refresh_token:{type:String},
     userID:{type:String}
});
var backupModel = mongoose.model('acessBackup',backup);

/*other variables*/

// today date in YYYY-MM-DD format
var _day= moment().format('YYYY-MM-DD');

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
	//var userId = req.cookies.fitbitUser||-1;
	//console.log(userId);
	fitbit.getAccessToken(req.query.code,config.serverURL).then(auth => {
		// when we are here, we get the access token and user ID// then we save the access in database
		
		// use the access token to fetch the user's information
	fitbit.get("/profile.json", auth.access_token).then(results => {
		//before save to database, we need to check the user subscribe or not by checking userId in database
		var checkId= results[0].user.encodedId;
		profileModel.findOne({'userID':checkId},function(err,doc){
					 if (doc) {
					 		//user data is in database
					 				console.log('user has followed');
					 				res.send('Hello '+results[0].user.fullName+' !'
					 							+'you have already followed our service!');
					 } else{
					 	  // user data is not in database, then save it.
					 	  // init the helath data as 0 and update them later.
							var saveprofile= new profileModel({ access_token:auth.access_token,
															    refresh_token:auth.refresh_token,
										   						userID:results[0].user.encodedId,
										   						name:results[0].user.fullName,
										   						gender:results[0].user.gender,
										   						DailySteps:0,
										   						DailySleep:0,
										   						AverageHR:0});
							//console.log('test: '+saveprofile.DailySteps);
								saveprofile.save(function(err){
																if(err) return console.error(err);
																console.log("Got new user!");
																console.log("Current time "+getDateTime());
																console.log('New User name: '+saveprofile.name);
																console.log('New User ID: '+saveprofile.userID);
																console.log('Acess Token: '+auth.access_token);
																console.log('Refresh Token: '+auth.refresh_token);
																});
							// build backup for access token
								var savebackup = new backupModel({access_token:auth.access_token,
															      refresh_token:auth.refresh_token,
															      userID:results[0].user.encodedId});
									savebackup.save(function(err){
																  if (err) return console.err(err);
																  console.log('Building access backup finished.');
																	});

									res.send('Hello '+results[0].user.fullName+' !'
					 							+'You have subscribed our service! Now you can close this page!');
					 		}		
		});

			//console.log(results[0].user.encodedId); test

		}).catch(err => {res.status(err.status).send(err);

		});
	       }).catch(err => {res.status(err.status).send(err);});
});
// the main function to updata subscriber data. work in progress
/*
     access_token:{type:String},
     refresh_token:{type:String},
     userID:{type:String},
     name:{type:String},
     gender:{type:String},
     DailySteps:{type:Number},
     DailySleep:{type:Number},
     AverageHR:{type:Number} 
*/
var FitbitSync = function(subscr){

	// copy a collection to change and check
	var checkingProfile = new profileModel(subscr);
	//
	var needUpdate = false;
	//
	var needFresh = false;



	// // update activity data 
	var _Getdata = function(subscriber){
			//First, we try to get the data with the current access token available.
		if (subscriber.userID=='test') {
			console.log('Here is a test data to avoid error');
			} else{

			fitbit.get("/profile.json",subscriber.access_token).then(function(result){
			console.log('Checking User '+subscriber.userID+' availability of access_token');


			// check the token first
			//(result[0].errors && result[0].errors.length > 0 && result[0].errors[0].errorType === 'expired_token')
			if ((result[0].errors && result[0].errors.length > 0 && result[0].errors[0].errorType === 'expired_token')){
				console.log('User '+subscriber.userID+' token expired, need to be refreshed');
				fitbit.refreshAccessToken(subscriber.access_token,subscriber.refresh_token,28800).then(function(newtoken){
					console.log(newtoken);
					subscriber.access_token = newtoken.access_token;
					subscriber.refresh_token = newtoken.refresh_token;
					needFresh = true;
					_updateTokens(subscriber);
					
				},function(err){
					console.log(subscriber.userID+'`refresh token failed');
					console.log(err.context);
					backupModel.findOne({userID:subscriber.userID},function(err,doc){
						if (doc) {
							console.log('Start to use backup token for User '+subscriber.userID);
							fitbit.refreshAccessToken(doc.access_token,doc.refresh_token,28800).then(function(newtoken){
											console.log(newtoken);
										subscriber.access_token = newtoken.access_token;
										subscriber.refresh_token = newtoken.refresh_token;
										needFresh = true;
										_updateTokens(subscriber);
								},function(err){
										console.log(subscriber.userID+' using backup tokens failed');
										console.log(err.context);
										});
								} else {
									console.log('finding backup token failed');
								}
					});
					

				});

			} else {
				console.log('User '+subscriber.userID+' Token is valid.');
				console.log('Start to check User'+subscriber.userID+' `s health data...');
				_GetHealthData(subscriber);
				
			}
		
		},function(err){console.log(err)});
	};
}

	// update activity data 
	var _GetHealthData = function(subscriber){
		var newSteps;
		var newSleep;
		var newHR;
		var stepsSets;
		// fetch steps
		fitbit.get('/activities/date/' +_day + '.json',subscriber.access_token).then(function(result){
			if ((result[0].errors && result[0].errors.length > 0 && result[0].errors[0].errorType === 'expired_token')) {
				console.log('token expired');
			}
				 
				//console.log(stepSets);
				stepSets = result[0]['summary'];
				if (!stepSets.hasOwnProperty('steps')) {
					console.log('Fail to fetch user '+subscriber.userID+'`steps due to the user doesn`t start to use it.');
					newSteps=0;
				} else{

					newSteps = result[0]['summary']['steps'];
				}
				
				///activities/heart/date/'+_day+'/1d/1sec.json
				fitbit.get('/sleep/date/'+_day+'.json',subscriber.access_token).then(function(Sleep){
							//console.log(sleepSets);
						if (!Sleep[0].summary.hasOwnProperty('stages')) {
							console.log('Fail to fetch user '+subscriber.userID+'`sleep due due to the user doesn`t start to use it.');
							newSleep = 0;
						} else {
							newSleep = Sleep[0].summary.totalMinutesAsleep;
						}
						fitbit.get('/activities/heart/date/today/1d.json',subscriber.access_token).then(function(HR){
								if (!HR[0]['activities-heart'][0].value.hasOwnProperty('restingHeartRate')) {
									console.log('Fail to fetch user '+subscriber.userID+'`HR due due to the user doesn`t start to use it.');
									newHR = 0;
								} else {
									newHR = HR[0]['activities-heart'][0].value.restingHeartRate;
								}
						if (newSteps!=subscriber.DailySteps||newSleep!=subscriber.DailySleep||newHR!=subscriber.AverageHR) {
									needUpdate = true;
									subscriber.DailySteps = newSteps;
									subscriber.DailySleep = newSleep;
									subscriber.AverageHR = newHR;
									_updateDatabase(subscriber);
									console.log('User '+subscriber.userID+'`s DailySteps has been updated to '+subscriber.DailySteps);
									console.log('TotalAsleep time has been updated to '+subscriber.DailySleep);
									console.log('Average heartrate has been updated to '+subscriber.AverageHR);
							}  else {
									console.log('User '+subscriber.userID+' doesn`t need update');
									}

						},function(err){console.log(err)});
				
				},function(err){console.log(err)});


		},function(err){console.log(err)});
	
	};


		//update the data when needUpdate == true
	var _updateDatabase = function(subscriber){
		console.log('User: '+subscriber.userID+' `s data need to be updated');
		if (needUpdate) {
			profileModel.updateOne({userID:subscriber.userID},{name:subscriber.name,
     														   gender:subscriber.gender,
     													       DailySteps:subscriber.DailySteps,
     														   DailySleep:subscriber.DailySleep,
     														   AverageHR:subscriber.AverageHR,
     														   updatedDate: new Date},
		function(err,docs){
			if(err) console.log(err);
			console.log('Successfully update for User '+subscriber.userID);
		});
		}

	};


		// update tokens when needFresh == true
	var _updateTokens = function(subscriber,Backup){
		console.log('User '+subscriber.userID+' '+subscriber.name+' `s token need to be refreshed: '+needFresh);
		if(needFresh){
			profileModel.updateOne({userID:subscriber.userID},{access_token: subscriber.access_token,
															   refresh_token: subscriber.refresh_token},
				function(err,docs){
				if (err) {console.log(err);}
				console.log('Successfully refresh the token for user '+subscriber.userID);
			});

			backupModel.updateOne({userID:subscriber.userID},{access_token: subscriber.access_token,
															   refresh_token: subscriber.refresh_token},
				function(err,docs){
				if (err) {console.log(err);}
			});
		}
		console.log('Start to check User'+subscriber.userID+' `s health data...');
		_GetHealthData(subscriber);
	};



	this.syncProfile =function(){
		_Getdata(checkingProfile);
	};

				//console.log('UserId: '+checkingprofile.userID);
				//console.log('access_token: '+checkingprofile.name);
				//console.log('Date: '+_day);
			    //console.log("   ");
}
	
/*here is the end of function FitbitSync()*/


/*a time-showing function to show current time in console*/
function getDateTime(){
	var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "/" + month + "/" + day + "/" + hour + ":" + min + ":" + sec;

}

function  multiThreadingProfile() {
	console.log(" ");
	console.log(" ");
	console.log("Current sync process begin at "+getDateTime());
	console.log("The "+runTurns+" turn after the server start.");
	console.log(" ");
	runTurns++;
		profileModel.find({},(err,profiles)=>{
		profiles.forEach((profileModel)=>{
			new FitbitSync(profileModel).syncProfile();
		});
	});
}


multiThreadingProfile();
/* an interval function to refresh data during a certain time. currently let it run a time for half hour*/
setInterval(function(){
	multiThreadingProfile();
},600000);

//1800000


app.listen(3000);
console.log('Server running at http:localhost:3000/');

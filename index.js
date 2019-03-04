

var FitbitApiClient= require('fitbit-node');
var express = require('express');
var router= express.Router();
var app= express();
var config = require('server-config');
var cookieParser = require('cookie-parser');
var moment = require('moment');
var CLIENT_ID = '';
var CLIENT_SECRET = '';
var mongoose = require('mongoose');
	mongoose.connect('mongodb+srv://Jing:<password>.mongodb.net/test?retryWrites=true',{ useNewUrlParser: true });
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
     AverageHR:{type:Number}
    });
var profileModel = mongoose.model('profile',profile);
var fitbit = new FitbitApiClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    apiVersion: '1.2'
});

app.use('/',router);
router.use(cookieParser());
router.get('/auth/:userId',(req, res) => {

    //res.cookie('fitbitUser', req.params.userId);

    res.redirect(fitbit.getAuthorizeUrl(
        'activity heartrate location nutrition profile settings sleep social weight',config.serverURL,'login cosent'
        )); 
});

router.get("/callback", (req, res) => {
	//var userId = req.cookies.fitbitUser||-1;
	//console.log(userId);
	fitbit.getAccessToken(req.query.code,config.serverURL).then(result => {
		// when we are here, we get the access token and user ID// then we save the access in database
		
		// use the access token to fetch the user's information
	fitbit.get("/profile.json", result.access_token).then(results => {
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
							var saveprofile= new profileModel({ access_token:result.access_token,
															    refresh_token:result.refresh_token,
										   						userID:results[0].user.encodedId,
										   						name:results[0].user.fullName,
										   						gender:results[0].user.gender,
										   						DailySteps:0,
										   						DailySleep:0,
										   						AverageHR:0});
							//console.log('test: '+saveprofile.DailySteps);
								saveprofile.save(function(err){
																if(err) return console.error(err);
																console.log("got new user!");
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
	// today date in YYYY-MM-DD format
	var _day= moment().format('YYYY-MM-DD');
	// copy a collection to change and check
	var checkingprofile = new profileModel(subscr);

	this.syncProfile =function(){
	};
	var _Getdata = function(path,subscriber){
		fitbit.get(path,subscriber.access_token)
	}
				console.log('UserId: '+checkingprofile.userID);
				console.log('access_token: '+checkingprofile.name);
				console.log('Date: '+_day);
				console.log("   ");
}
	
// an interval function to refresh data during a certain time. currently let it run a time for 10 minutes
setInterval(function(){
		profileModel.find({},(err,profiles)=>{
		profiles.forEach((profileModel)=>{
			FitbitSync(profileModel);
		});
	});
},6000);

app.listen(3000);
console.log('Server running at http:localhost:3000/');

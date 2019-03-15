
/*require packages*/
var FitbitApiClient= require('fitbit-node');
var express = require('express');
var router= express.Router();
var app= express();
var config = require('server-config');
var moment = require('moment');
var clog = require('c-log');

/*Fitbit CLient password*/
var CLIENT_ID = '22DK4S';
var CLIENT_SECRET = 'f0a45c9180790c7fb2baf1bfe7c46c0d';
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
    clog.log("MongoDB Opened!");
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

app.use('/',router);
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
                                    clog.log('user has followed');
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
                                                                var newUser= [{
                                                                    newUserName: saveprofile.name,
                                                                    newUserID: saveprofile.userID,
                                                                    UpdateTime: getDateTime()
                                                                }];
                                                                clog.success("Got new user!");
                                                                clog.table(newUser);
                                                                clog.info('Access Token'+auth.access_token);
                                                                clog.info('Refresh Token'+auth.refresh_token);
                                                                });
                            // build backup for access token
                                var savebackup = new backupModel({access_token:auth.access_token,
                                                                  refresh_token:auth.refresh_token,
                                                                  userID:results[0].user.encodedId});
                                    savebackup.save(function(err){
                                                                  if (err) return console.err(err);
                                                                  clog.success('Building access backup finished.');
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


app.listen(3000);

module.exports = app;

/*
Thanks to the article of Raphael Londner
URL: https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas
*/
/*require packages*/
var MongoClient = require('mongodb').MongoClient;
const FitbitApiClient= require('fitbit-node');
const moment = require('moment');
const clog = require('c-log');
//const AWS = require('aws-sdk');
let atlas_connection_uri;
let cachedDb = null;

/*Fitbit CLient password*/
var CLIENT_ID = '22DCGZ';
var CLIENT_SECRET = '9a9bc5ff34992717f7d7cc1f391a4268';
var fitbit = new FitbitApiClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    apiVersion: '1.2'
});

// today date in YYYY-MM-DD format
var _day= moment().format('YYYY-MM-DD');

exports.handler = (event, context, callback) => {
    var uri = 'mongodb+srv://Suwarna_proj:1!Ambadas@clustermongodb-zj7du.mongodb.net/test?retryWrites=true';
    
    if (atlas_connection_uri != null) {
        processEvent(event, context, callback);
    } 
    else {
        atlas_connection_uri = uri;
        clog.log('the Atlas connection string is ' + atlas_connection_uri);
        processEvent(event, context, callback);
    } 
};

function processEvent(event, context, callback) {
    clog.log('Calling MongoDB Atlas from AWS Lambda with event: ' + JSON.stringify(event));
    var jsonContents = JSON.parse(JSON.stringify(event));
    
    //date conversion for grades array
    if(jsonContents.grades != null) {
        for(var i = 0, len=jsonContents.grades.length; i < len; i++) {
            //use the following line if you want to preserve the original dates
            //jsonContents.grades[i].date = new Date(jsonContents.grades[i].date);
            
            //the following line assigns the current date so we can more easily differentiate between similar records
            jsonContents.grades[i].date = new Date();
        }
    }
    
    //the following line is critical for performance reasons to allow re-use of database connections across calls to this Lambda function and avoid closing the database connection. The first call to this lambda function takes about 5 seconds to complete, while subsequent, close calls will only take a few hundred milliseconds.
    context.callbackWaitsForEmptyEventLoop = false;
    
    try {
        if (cachedDb == null) {
            clog.log('=> connecting to database');
            MongoClient.connect(atlas_connection_uri,{ useNewUrlParser: true }, function (err, client) {
                cachedDb = client.db('test');
                return SyncDoc(cachedDb, jsonContents, callback);
            });
        }
        else {
            SyncDoc(cachedDb, jsonContents, callback);
        }
    }
    catch (err) {
        clog.error('an error occurred', err);
    }
}



function SyncDoc (db, json, callback) {

  TraverseDatabase(db,json,callback);
setTimeout( function () {
      db.collection('localhistory').insertOne( json, function(err, result) {
      if(err!=null) {
          clog.error("an error occurred in createDoc", err);
          callback(null, JSON.stringify(err));
      }
      else {
        clog.log("Kudos! You just created an entry into the restaurants");
        callback(null, "SUCCESS");
      }
      //we don't need to close the connection thanks to context.callbackWaitsForEmptyEventLoop = false (above)
      //this will let our function re-use the connection on the next called (if it can re-use the same Lambda container)
      //db.close();
  });
},10000);
};




function  TraverseDatabase(db,json, callback) {
    var count = 1;
    //clog.log("Current sync process begin at "+getDateTime());
db.collection('localprofiles').find({},(err,profiles)=>{
        profiles.forEach((profileModel)=>{
            new FitbitSync(profileModel,db).syncProfile();
        });
    });

}

var FitbitSync = function(subscr,db){

    // copy a collection to change and check
    var checkingProfile = subscr;
    //
    var needUpdate = false;
    //
    var needFresh = false;



    // // update activity data 
    var _Getdata = function(subscriber){
            //First, we try to get the data with the current access token available.
        if (subscriber.userID=='test') {
            clog.log('Here is a test data to avoid error');
            } else{

            fitbit.get("/profile.json",subscriber.access_token).then(function(result){
            clog.log('Checking User '+subscriber.userID+' availability of access_token');


            // check the token first
            //(result[0].errors && result[0].errors.length > 0 && result[0].errors[0].errorType === 'expired_token')
            if (true){
                clog.log('User '+subscriber.userID+' token expired, need to be refreshed');
                fitbit.refreshAccessToken(subscriber.access_token,subscriber.refresh_token,28800).then(function(newtoken){
                    clog.log(newtoken);
                    subscriber.access_token = newtoken.access_token;
                    subscriber.refresh_token = newtoken.refresh_token;
                    needFresh = true;
                    _updateTokens(subscriber);
                    
                },function(err){
                    clog.error(subscriber.userID+'`refresh token failed'+err.context);
                    db.collection('localaccessbackups').findOne({userID:subscriber.userID},function(err,doc){
                        if (doc) {
                            clog.log('Start to use backup token for User '+subscriber.userID);
                            fitbit.refreshAccessToken(doc.access_token,doc.refresh_token,28800).then(function(newtoken){
                                            clog.log(newtoken);
                                        subscriber.access_token = newtoken.access_token;
                                        subscriber.refresh_token = newtoken.refresh_token;
                                        needFresh = true;
                                        _updateTokens(subscriber);
                                },function(err){
                                        clog.error(subscriber.userID+' using backup tokens failed');
                                        clog.error(err.context);
                                        });
                                } else {
                                    clog.error('finding backup token failed');
                                }
                    });
                    

                });

            } else {
                clog.log('User '+subscriber.userID+' Token is valid.');
                clog.log('Start to check User'+subscriber.userID+' `s health data...');
                _GetHealthData(subscriber);
                
            }
        
        },function(err){clog.error(err)});
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
                clog.log('token expired');
            }
                stepSets = result[0]['summary'];
                if (!stepSets.hasOwnProperty('steps')) {
                    clog.log('Fail to fetch user '+subscriber.userID+'`steps due to the user doesn`t start to use it.');
                    newSteps=0;
                } else{

                    newSteps = result[0]['summary']['steps'];
                }
                
                ///activities/heart/date/'+_day+'/1d/1sec.json
                fitbit.get('/sleep/date/'+_day+'.json',subscriber.access_token).then(function(Sleep){
                            //clog.log(sleepSets);
                        if (!Sleep[0].summary.hasOwnProperty('stages')) {
                            clog.log('Fail to fetch user '+subscriber.userID+'`sleep due due to the user doesn`t start to use it.');
                            newSleep = 0;
                        } else {
                            newSleep = Sleep[0].summary.totalMinutesAsleep;
                        }
                        fitbit.get('/activities/heart/date/today/1d.json',subscriber.access_token).then(function(HR){
                                if (!HR[0]['activities-heart'][0].value.hasOwnProperty('restingHeartRate')) {
                                    clog.log('Fail to fetch user '+subscriber.userID+'`HR due due to the user doesn`t start to use it.');
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
                                var updateData= [{
                                        userName: subscriber.name,
                                        userID: subscriber.userID,
                                        Steps: subscriber.DailySteps,
                                        Sleep: subscriber.DailySleep,
                                        HR: subscriber.AverageHR
                                    }];
                                    clog.table(updateData);

                            }  else {
                                    clog.log('User '+subscriber.userID+' doesn`t need update');
                                    }

                        },function(err){clog.error(err)});
                
                },function(err){clog.error(err)});


        },function(err){clog.error(err)});
    
    };


        //update the data when needUpdate == true
    var _updateDatabase = function(subscriber){
        clog.log('User: '+subscriber.userID+' `s data need to be updated');
        if (needUpdate) {
            db.collection('localprofiles').updateOne({userID:subscriber.userID},{$set: {
                                                               name:subscriber.name,
                                                               gender:subscriber.gender,
                                                               DailySteps:subscriber.DailySteps,
                                                               DailySleep:subscriber.DailySleep,
                                                               AverageHR:subscriber.AverageHR,
                                                               updatedDate: new Date}},
        function(err,docs){
            if(err) clog.error(err);
            clog.log('Successfully update for User '+subscriber.userID);
        });
        }

    };


        // update tokens when needFresh == true
    var _updateTokens = function(subscriber,Backup){
        clog.log('User '+subscriber.userID+' '+subscriber.name+' `s token need to be refreshed: '+needFresh);
        if(needFresh){
             db.collection('localprofiles').updateOne({userID:subscriber.userID},{$set:{access_token: subscriber.access_token,
                                                                                    refresh_token: subscriber.refresh_token}},
                function(err,docs){
                if (err) {clog.error(err);}
                clog.log('Successfully refresh the token for user '+subscriber.userID);
            });

            db.collection('localaccessbackups').updateOne({userID:subscriber.userID},{$set: {access_token: subscriber.access_token,
                                                               refresh_token: subscriber.refresh_token}},
                function(err,docs){
                if (err) {clog.error(err);}
            });
        }
        clog.log('Start to check User'+subscriber.userID+' `s health data...');
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

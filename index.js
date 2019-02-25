var FitbitApiClient= require('fitbit-node');
var express = require('express');
var app= express();
var config = require('config');
var cookieParser = require('cookie-parser');
//var router = express.Router();
//var http = require('http');
var CLIENT_ID = '22DCGZ';
var CLIENT_SECRET = 'df7da6616e9fbba120234353abfb8227';

var fitbit = new FitbitApiClient({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    apiVersion: '1.2'
});

app.get('/auth/:userId', function (req, res) {

    res.cookie('fitbitUser', req.params.userId);
    res.send('here is test: '+fitbit.getAuthorizeUrl(
        'activity heartrate location nutrition profile settings sleep social weight',
        config.serverURL + '/sensors/fitbit/callback'));

    //TODO: BECAUSE THIS REDIRECTS TO NUCOACH, IT CAUSES A PROBLEM IN COOKIES. update the app.
    res.redirect(fitbit.getAuthorizeUrl(
        'activity heartrate location nutrition profile settings sleep social weight',
        config.serverURL + '/sensors/fitbit/callback'));

});
/**
 * create subscription, once the callback is called.
 */
app.get('/callback', function (req, res) {

    var userId = req.cookies.fitbitUser || -1;


    fitbit.getAccessToken(req.query.code, config.serverURL + '/sensors/fitbit/callback').then(function (result) {
        // use the access token to fetch the user's profile information

        // if we are here, we have the token and user ID
        new Parse.Query(Parse.User)
            .include('personalProfile.fitbit')
            .get(userId, {
                useMasterKey: true,
                success: function (user) {
                    // success
                    if (user) {
                        // user exist
                        console.log('user exist');
                        if (user.get('personalProfile').get('fitbit')) {
                            console.log('fitbit subscription already exist, update the token');
                            user.get('personalProfile').get('fitbit').set('auth', result)
                                .save(null, {
                                    useMasterKey: true,
                                    success: function () {
                                        new Notification()
                                            .set('user', user)
                                            .set('title', 'NUcoach')
                                            .set('body', 'Successfully updated your Fitbit subscription.')
                                            .save(null, {useMasterKey: true});

                                        res.send('successfully updated your Fitbit subscription. You may close this window');
                                    }, error: function (o, e) {
                                        res.send(e);
                                    }
                                });
                        } else {
                            // fitbit subscription does not exist, create one
                            var sub = new SensorSubscription();
                            sub.set('user', user)
                                .set('sensor', {
                                    "__type": "Pointer",
                                    "className": "DHL_sensor",
                                    "objectId": "XIfI16u3hb"
                                })
                                .set('auth', result)
                                .set('deleted', false);

                            var acl = new Parse.ACL(user);

                            // let the sensorSubscriptions role read the subscriptions.
                            acl.setRoleReadAccess('sensorSubscriptions', true);

                            sub.setACL(acl);

                            sub.save(null, {
                                useMasterKey: true,
                                success: function (newSubscription) {
                                    // subscription created
                                    user.get('personalProfile').set('fitbit', newSubscription)
                                        .save(null, {
                                            useMasterKey: true,
                                            success: function () {

                                                new Notification()
                                                    .set('user', user)
                                                    .set('title', 'NUcoach')
                                                    .set('body', 'Successfully linked your Fitbit account.')
                                                    .save(null, {useMasterKey: true});

                                                res.send('successfully linked your Fitbit account. You may close this window');
                                            }, error: function (o, e) {
                                                res.send(e);
                                            }
                                        });
                                },
                                error: function (o, e) {
                                    res.send(e);
                                }
                            });
                        }
                    } else {
                        res.send('User does not exist');
                    }
                }, error: function (u, e) {
                    // cant get the user
                    res.send(e);
                }
            });

    }).catch(function (error) {
        res.send(error);
    });


});
app.listen(3000);
console.log('Server running at http://127.0.0.1:3000/');
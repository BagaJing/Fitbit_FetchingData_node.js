   // the same function with index.js
    var FitbitClient = require('fitbit-client-oauth2');
    var express= require('express');
    var app= express();
    var client = new FitbitClient('22DCGZ', '3c1114725f32640d4fe7579fdf1ac67d' );
    
  var redirect_uri = 'https://s3.amazonaws.com/arkafit/index.html';
    var scope =  'activity nutrition profile settings sleep social weight';
    
    app.get('/auth/fitbit', function(req, res, next) {
    
        var authorization_uri = client.getAuthorizationUrl(redirect_uri, scope);
        
        res.redirect(authorization_uri);
    });
    
    // If /auth/fitbit/callbac is your redirec_uri
    
    app.get('/auth/fitbit/callback', function(req, res, next) {
    
        var code = req.query.code;
        
        client.getToken(code, redirect_uri)
            .then(function(token) {

                // ... save your token on db or session... 
                
                // then redirect
                res.redirect(302, '/user');

            })
            .catch(function(err) {
                // something went wrong.
                res.send(500, err);
            
            });
    
    });
app.listen(3000);
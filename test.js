var FitbitApiClient= require('fitbit-node');
var express = require('express');
var router= express.Router();
var app= express();
var config = require('server-config');
var cookieParser = require('cookie-parser');
var moment = require('moment');
var CLIENT_ID = '22DCGZ';
var CLIENT_SECRET = '3a73dff1a1dadf37b573f5267a5ea3bf';

app.use('/',router);
router.use(cookieParser());
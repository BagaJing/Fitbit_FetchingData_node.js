# Fitbit_FetchingData_node.js
This is a in-progress project that fetch health data from fitbit api and save it into mongodb
then async the data with access_token

Description:

1.localserver.js is the code tested on terminal without lambda func (runing on localhost:/3000)

2.lambda_sync(local_testing).js is the health data sync funtion tested on terminal with "lambda-local"

3.lambda_sync(deployed).js is the health data sync funtion that is currently deployed on AWS lambda

4.login.js&&login_deploy.js include the function to let user login and get their personal data and save them in mogodb.
    Deployed URL: https://n4cj09nlc1.execute-api.us-east-1.amazonaws.com/xWell/auth/:userId
    
    
 To be continued...

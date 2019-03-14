# Fitbit_FetchingData_node.js
This is a in-progress project that fetch health data from fitbit api and save it into mongodb
then async the data with access_token

For index.js, it is the program running on local server.
For app.js and lambda.js, they are program we try to deploy on lambda function.(In progress)

The link for AWS API gateway that we are using here is:
https://lfm06u0hlc.execute-api.us-east-1.amazonaws.com/dev/auth/:userId
The user's data will be saved in mongodb when the user do login.

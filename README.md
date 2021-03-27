# grafana-fargate-cdk
Grafana on Fargate Spot using Aurora Serverless deployed with the CDK. 

In late 2019 I updated https://github.com/ulikabbq/grafana-fargate, and since noting has happened since then except that the CDK got more awesome, I decided to revisit the project but convert it to the CDK. It also seemed like it needed its own repo so here we are. 

Along with the CDK it also seemed like the 2021 Devopsy thing we should do is run this on Fargate Spot and Aurora Serverless. This setup still uses Chamber to pull in the SSM Parameters as Environment Variables, but now you don't have to manually create any of them.  

I was also inspired by the CDK work of https://github.com/pahud and I incorporated his bash lambda to write the database password to SSM as a SecretString. I really wanted this version to be nothing more than running `cdk deploy` and you would have everything needed for Grafana. 

Prerequisites: 
* docker 
* node/npm
* cdk 

To get started:
* git clone repo
* npm install 
* cd cdk 
* cdk deploy 
 
wait a few minutes.....

More updates to come....



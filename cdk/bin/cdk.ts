#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { GrafanaStack } from '../lib/grafana-stack';
import * as bashLambda from 'cdk-lambda-bash';
import * as iam from "@aws-cdk/aws-iam";

const path = require('path');

const grafanaEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();
const stack = new GrafanaStack(app, 'GrafanaStack',{ env: grafanaEnv });

const fn = new bashLambda.BashExecFunction(stack, 'GrafanaLambda', {
  script: path.join(__dirname, '../ssm.sh'),
})

const ssmResource = "arn:aws:ssm:" + process.env.CDK_DEFAULT_REGION + ":" + process.env.CDK_DEFAULT_ACCOUNT + ":parameter/grafana*"
fn.handler.role?.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: [ssmResource],
    actions: [            
      'ssm:PutParameter'
    ]
  })
);

const secretResource = 'arn:aws:secretsmanager:' + process.env.CDK_DEFAULT_REGION + ":" + process.env.CDK_DEFAULT_ACCOUNT + ':secret:grafanaDB*'
fn.handler.role?.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: [secretResource],
    actions: [            
      'secretsmanager:GetSecretValue'
    ]
  })
);

// run it as custom resource on deployment
fn.run({ runOnUpdate: true });


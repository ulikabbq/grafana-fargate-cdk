import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as rds from '@aws-cdk/aws-rds';
import * as iam from "@aws-cdk/aws-iam";
import * as ssm from '@aws-cdk/aws-ssm';
import * as secretsManager from '@aws-cdk/aws-secretsmanager'

export class GrafanaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'GrafanaVPC', {
      cidr: "10.0.0.0/22",
      natGateways: 1
   })
    
    // ECS Cluster
    const cluster = new ecs.Cluster(this, "GrafanaCluster", {
      vpc: vpc,
      clusterName: 'grafana',
      capacityProviders: ['FARGATE_SPOT'],
    });

    // CW Logging
    const logging = new ecs.AwsLogDriver({
      streamPrefix: "grafana",
    })

    // Task Definition and Container Definition defined to set port 3000 for Grafana 
    const taskDef = new ecs.FargateTaskDefinition(this, 'taskDef', {
      family: "grafana",
      memoryLimitMiB: 1024, 
      cpu: 512,
    })

    const containerDef = new ecs.ContainerDefinition(this, 'containerDef', {
      taskDefinition: taskDef,
      logging: logging,
      image: ecs.ContainerImage.fromAsset("../") ,
    })

    containerDef.addPortMappings({
      containerPort: 3000
    })

    // Create a load-balanced Fargate service and make it public
    const fargate = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "GrafanaFargateService", {
      serviceName: 'grafana',
      cluster: cluster, 
      listenerPort: 80,
      desiredCount: 1, 
      taskDefinition: taskDef, 
      publicLoadBalancer: true,
    });

    // Set health check path 
    fargate.targetGroup.configureHealthCheck({
      path: '/api/health'
    })

    
    // allow access to ssm parameters 
    const ssmResource = "arn:aws:ssm:" + this.region + ":" + this.account + ":parameter/grafana*"
    const taskRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [ssmResource],
      actions: [
        "ssm:GetParameter*"
      ]
    })
    
    const taskSSMRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ["*"],
      actions: [
        "ssm:DescribeParameters"
      ]
    })

    const ssmKMS = "arn:aws:kms:" + this.region + ":" + this.account + ":alias/aws/ssm"
    const taskKMSRolePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [ssmKMS],
      actions: [
        "kms:Decrypt"
      ]
    })

    fargate.taskDefinition.addToTaskRolePolicy(taskRolePolicy);
    fargate.taskDefinition.addToTaskRolePolicy(taskSSMRolePolicy);
    fargate.taskDefinition.addToTaskRolePolicy(taskKMSRolePolicy);

    // setup database 
    const dbCreds = new secretsManager.Secret(this, 'grafanaDB', {
        secretName: `grafanaDB`,
        
        generateSecretString: {
            secretStringTemplate: JSON.stringify({
                username: 'grafana',
            }),
            generateStringKey: 'password',
            excludePunctuation: true
        }
    });

    const auroraCluster = new rds.ServerlessCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      defaultDatabaseName: 'grafana',
      credentials: rds.Credentials.fromSecret(dbCreds),
      enableDataApi: true,
      vpc,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    auroraCluster.connections.allowDefaultPortFrom(fargate.service)
    
    // Configure Grafana with SSM Parameters 
    new ssm.StringParameter(this, 'GF_DATABASE_HOST', {
      parameterName: '/grafana/GF_DATABASE_HOST',
      stringValue: auroraCluster.clusterEndpoint.socketAddress
    });
 
    new ssm.StringParameter(this, 'GF_DATABASE_USER', {
      parameterName: '/grafana/GF_DATABASE_USER',
      stringValue: 'grafana',
    });
    
    new ssm.StringParameter(this, 'GF_LOG_LEVEL', {
      parameterName: '/grafana/GF_LOG_LEVEL',
      stringValue: 'INFO'
    })

    new ssm.StringParameter(this, 'GF_DATABASE_TYPE', {
      parameterName: '/grafana/GF_DATABASE_TYPE',
      stringValue: 'mysql',
    });

  }
}